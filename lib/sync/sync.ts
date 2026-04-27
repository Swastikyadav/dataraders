import type { Prisma, PrismaClient } from "@prisma/client";
import type { Connector } from "@/lib/connectors/types";
import type { CanonicalProduct, CanonicalOrder } from "@/lib/types/canonical";

// =============================================================================
// SYNC ORCHESTRATOR — single connector
// =============================================================================
// Pulls products → customers → orders → line items from one connector and
// upserts them into the canonical schema.
//
// Idempotent: re-running produces the same DB state.
// Transactional per order: line item replacement is atomic.
// Records SyncState on both success and failure.

export interface SyncResult {
  platform: string;
  productsSynced: number;
  ordersSynced: number;
  customersSynced: number;
  durationMs: number;
  status: "success" | "error";
  error?: string;
}

export async function syncConnector(
  db: PrismaClient,
  connector: Connector,
): Promise<SyncResult> {
  const start = Date.now();
  const result: SyncResult = {
    platform: connector.platform,
    productsSynced: 0,
    ordersSynced: 0,
    customersSynced: 0,
    durationMs: 0,
    status: "success",
  };

  try {
    // ---- 1. Products first ---------------------------------------------------
    // Order items reference products by SKU; products must exist before we
    // write any orders so the productId resolution in upsertOrder() works.
    const products = await connector.fetchProducts();
    for (const p of products) {
      await upsertProduct(db, p);
      result.productsSynced++;
    }

    // ---- 2. Orders (with embedded customers + items) ------------------------
    const orders = await connector.fetchOrders();
    const seenCustomerKeys = new Set<string>();

    for (const o of orders) {
      let customerId: string | null = null;
      if (o.customer) {
        const cust = await upsertCustomer(db, o.customer);
        customerId = cust.id;
        const key = `${o.customer.platform}::${o.customer.platformCustomerId}`;
        if (!seenCustomerKeys.has(key)) {
          seenCustomerKeys.add(key);
          result.customersSynced++;
        }
      }
      await upsertOrder(db, o, customerId);
      result.ordersSynced++;
    }

    // ---- 3. Record success state --------------------------------------------
    await db.syncState.upsert({
      where: { platform: connector.platform },
      create: {
        platform: connector.platform,
        lastSyncedAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        ordersSynced: result.ordersSynced,
        productsSynced: result.productsSynced,
        customersSynced: result.customersSynced,
      },
      update: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "success",
        lastSyncError: null,
        ordersSynced: result.ordersSynced,
        productsSynced: result.productsSynced,
        customersSynced: result.customersSynced,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.status = "error";
    result.error = message;

    // Record failure state — even if the sync itself failed, observability
    // about the failure is critical for the dashboard's "last synced" display.
    await db.syncState
      .upsert({
        where: { platform: connector.platform },
        create: {
          platform: connector.platform,
          lastSyncedAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: message,
        },
        update: {
          lastSyncedAt: new Date(),
          lastSyncStatus: "error",
          lastSyncError: message,
        },
      })
      .catch(() => {
        // If even recording state fails, don't mask the original error.
      });
  }

  result.durationMs = Date.now() - start;
  return result;
}

// =============================================================================
// UPSERT HELPERS — the actual database writes
// =============================================================================

async function upsertProduct(db: PrismaClient, p: CanonicalProduct) {
  return db.product.upsert({
    where: {
      platform_platformProductId: {
        platform: p.platform,
        platformProductId: p.platformProductId,
      },
    },
    create: {
      platform: p.platform,
      platformProductId: p.platformProductId,
      title: p.title,
      vendor: p.vendor,
      sku: p.sku,
      priceAmount: p.priceAmount,
      priceCurrency: p.priceCurrency,
      inventoryQty: p.inventoryQty,
      status: p.status,
      imageUrl: p.imageUrl,
      rawData: p.rawData ? JSON.stringify(p.rawData) : null,
    },
    update: {
      title: p.title,
      vendor: p.vendor,
      sku: p.sku,
      priceAmount: p.priceAmount,
      priceCurrency: p.priceCurrency,
      inventoryQty: p.inventoryQty,
      status: p.status,
      imageUrl: p.imageUrl,
      rawData: p.rawData ? JSON.stringify(p.rawData) : null,
    },
  });
}

async function upsertCustomer(
  db: PrismaClient,
  c: NonNullable<CanonicalOrder["customer"]>,
) {
  return db.customer.upsert({
    where: {
      platform_platformCustomerId: {
        platform: c.platform,
        platformCustomerId: c.platformCustomerId,
      },
    },
    create: {
      platform: c.platform,
      platformCustomerId: c.platformCustomerId,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      rawData: c.rawData ? JSON.stringify(c.rawData) : null,
    },
    update: {
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      rawData: c.rawData ? JSON.stringify(c.rawData) : null,
    },
  });
}

async function upsertOrder(
  db: PrismaClient,
  o: CanonicalOrder,
  customerId: string | null,
) {
  // Resolve product references for line items by (platform, sku), this
  // makes the orderItem.productId join work in the dashboard.
  const itemsWithProductIds = await Promise.all(
    o.items.map(async (item) => {
      let productId: string | null = null;
      if (item.sku) {
        const product = await db.product.findFirst({
          where: { platform: o.platform, sku: item.sku },
          select: { id: true },
        });
        productId = product?.id ?? null;
      }
      return { item, productId };
    }),
  );

  // Per-order transaction: deletion of old items and insertion of new ones
  // must be atomic. A crash between steps would otherwise leave the order
  // with a half-correct line item set.
  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.order.findUnique({
      where: {
        platform_platformOrderId: {
          platform: o.platform,
          platformOrderId: o.platformOrderId,
        },
      },
      select: { id: true },
    });

    const orderData = {
      orderNumber: o.orderNumber,
      totalAmount: o.totalAmount,
      subtotalAmount: o.subtotalAmount,
      taxAmount: o.taxAmount,
      shippingAmount: o.shippingAmount,
      discountAmount: o.discountAmount,
      currency: o.currency,
      financialStatus: o.financialStatus,
      fulfillmentStatus: o.fulfillmentStatus,
      customerId,
      customerEmail: o.customerEmail,
      placedAt: o.placedAt,
      rawData: o.rawData ? JSON.stringify(o.rawData) : null,
    };

    const itemCreate = itemsWithProductIds.map(({ item, productId }) => ({
      productId,
      title: item.title,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      rawData: item.rawData ? JSON.stringify(item.rawData) : null,
    }));

    if (existing) {
      // Wholesale line item replacement, the platform is the source of truth.
      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
      await tx.order.update({
        where: { id: existing.id },
        data: { ...orderData, items: { create: itemCreate } },
      });
    } else {
      await tx.order.create({
        data: {
          platform: o.platform,
          platformOrderId: o.platformOrderId,
          ...orderData,
          items: { create: itemCreate },
        },
      });
    }
  });
}
