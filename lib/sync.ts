// =============================================================================
// SYNC SERVICE
// =============================================================================
// Idempotent, atomic sync operations that load canonical data into the database.
// Handles entity dependencies, failure isolation, and sync state tracking.

'use server';

import { db } from '@/lib/db';
import { Platform, CanonicalProduct, CanonicalCustomer, CanonicalOrder, CanonicalLineItem } from '@/lib/schema';
import { getConnector, getAllConnectors } from '@/lib/connectors/registry';

// =============================================================================
// SYNC RESULT
// =============================================================================

export interface SyncResult {
  platform: Platform;
  status: 'success' | 'failed';
  message?: string;
  productsCount: number;
  ordersCount: number;
  customersCount: number;
  startedAt: Date;
  completedAt: Date;
  duration: number; // milliseconds
}

// =============================================================================
// SYNC PLATFORM
// =============================================================================

export async function syncPlatform(
  platform: Platform
): Promise<SyncResult> {
  const startedAt = new Date();
  let productsCount = 0;
  let ordersCount = 0;
  let customersCount = 0;
  let status: 'success' | 'failed' = 'success';
  let message: string | undefined;

  try {
    const connector = getConnector(platform);

    // Fetch raw data from connector
    console.log(`[${platform}] Fetching products...`);
    const rawProducts = await connector.fetchProducts();
    console.log(`[${platform}] Fetched ${rawProducts.length} products`);

    console.log(`[${platform}] Fetching orders...`);
    const rawOrders = await connector.fetchOrders();
    console.log(`[${platform}] Fetched ${rawOrders.length} orders`);

    // Transform to canonical types
    console.log(`[${platform}] Transforming to canonical format...`);
    const products: CanonicalProduct[] = rawProducts.map((raw) =>
      connector.toCanonicalProduct(raw)
    );

    const orderResults = rawOrders.map((raw) =>
      connector.toCanonicalOrder(raw)
    );

    const orders: CanonicalOrder[] = orderResults.map((r) => r.order);
    const lineItems: Array<{
      canonical: CanonicalLineItem;
      platformOrderId: string;
    }> = orderResults.flatMap((r) =>
      r.lineItems.map((li) => ({
        canonical: li,
        platformOrderId: r.order.platformId,
      }))
    );
    const customers: CanonicalCustomer[] = orderResults
      .map((r) => r.customer)
      .filter((c): c is CanonicalCustomer => c !== null);

    // Build a map of products by SKU for matching line items
    const productBySku = new Map<string | null, string>(); // SKU -> canonical ID
    const productByPlatformId = new Map<string, string>(); // platformId -> canonical ID

    // Perform sync in transaction
    console.log(`[${platform}] Syncing to database...`);
    await db.$transaction(async (tx) => {
      // 1. Upsert products (unique: [platform, platformId])
      for (const product of products) {
        const dbProduct = await tx.product.upsert({
          where: {
            platform_platformId: {
              platform: product.platform,
              platformId: product.platformId,
            },
          },
          create: {
            platform: product.platform,
            platformId: product.platformId,
            title: product.title,
            sku: product.sku,
            description: product.description,
            price: product.price,
            currency: product.currency,
            inventory: product.inventory,
            status: product.status,
            imageUrl: product.imageUrl,
            rawData: product.rawData as any,
          },
          update: {
            title: product.title,
            sku: product.sku,
            description: product.description,
            price: product.price,
            currency: product.currency,
            inventory: product.inventory,
            status: product.status,
            imageUrl: product.imageUrl,
            rawData: product.rawData as any,
            updatedAt: new Date(),
          },
        });
        productByPlatformId.set(product.platformId, dbProduct.id);
        if (product.sku) {
          productBySku.set(product.sku, dbProduct.id);
        }
      }
      productsCount = products.length;
      console.log(`[${platform}] Upserted ${productsCount} products`);

      // 2. Upsert customers (unique: [platform, platformId])
      const customerMap = new Map<string, string>(); // platformId -> canonical ID
      for (const customer of customers) {
        const dbCustomer = await tx.customer.upsert({
          where: {
            platform_platformId: {
              platform: customer.platform,
              platformId: customer.platformId,
            },
          },
          create: {
            platform: customer.platform,
            platformId: customer.platformId,
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            rawData: customer.rawData as any,
          },
          update: {
            email: customer.email,
            firstName: customer.firstName,
            lastName: customer.lastName,
            rawData: customer.rawData as any,
            updatedAt: new Date(),
          },
        });
        customerMap.set(customer.platformId, dbCustomer.id);
      }
      customersCount = customers.length;
      console.log(`[${platform}] Upserted ${customersCount} customers`);

      // 3. Upsert orders (unique: [platform, platformId])
      const orderMap = new Map<string, string>(); // platformId -> canonical ID
      for (const order of orders) {
        const customerId = order.customerId
          ? customerMap.get(order.customerId)
          : null;

        const dbOrder = await tx.order.upsert({
          where: {
            platform_platformId: {
              platform: order.platform,
              platformId: order.platformId,
            },
          },
          create: {
            platform: order.platform,
            platformId: order.platformId,
            customerId: customerId || null,
            customerEmail: order.customerEmail,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            subtotal: order.subtotal,
            tax: order.tax,
            shipping: order.shipping,
            discount: order.discount,
            total: order.total,
            currency: order.currency,
            rawData: order.rawData as any,
          },
          update: {
            customerId: customerId || null,
            customerEmail: order.customerEmail,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            subtotal: order.subtotal,
            tax: order.tax,
            shipping: order.shipping,
            discount: order.discount,
            total: order.total,
            currency: order.currency,
            rawData: order.rawData as any,
            updatedAt: new Date(),
          },
        });
        orderMap.set(order.platformId, dbOrder.id);
      }
      ordersCount = orders.length;
      console.log(`[${platform}] Upserted ${ordersCount} orders`);

      // 4. Delete old line items and insert new ones (to handle edits)
      // Get all order IDs for this platform
      const platformOrders = await tx.order.findMany({
        where: { platform },
        select: { id: true },
      });
      const platformOrderIds = platformOrders.map((o) => o.id);

      if (platformOrderIds.length > 0) {
        await tx.lineItem.deleteMany({
          where: { orderId: { in: platformOrderIds } },
        });
      }

      // 5. Insert line items with resolved product IDs
      for (const { canonical: lineItem, platformOrderId } of lineItems) {
        const orderId = orderMap.get(platformOrderId);
        if (!orderId) {
          console.warn(
            `[${platform}] Warning: Could not find order for platform order ${platformOrderId}`
          );
          continue;
        }

        let productId: string | null = null;

        // Try to match by SKU first
        if (lineItem.sku) {
          productId = productBySku.get(lineItem.sku) || null;
        }

        await tx.lineItem.create({
          data: {
            orderId,
            productId,
            platform: lineItem.platform,
            sku: lineItem.sku,
            title: lineItem.title,
            quantity: lineItem.quantity,
            unitPrice: lineItem.unitPrice,
            total: lineItem.total,
            rawData: lineItem.rawData as any,
          },
        });
      }
      console.log(`[${platform}] Inserted ${lineItems.length} line items`);
    });

    console.log(`[${platform}] Sync completed successfully`);
  } catch (error) {
    status = 'failed';
    message = error instanceof Error ? error.message : String(error);
    console.error(`[${platform}] Sync failed:`, message);
  }

  const completedAt = new Date();
  const duration = completedAt.getTime() - startedAt.getTime();

  // Log sync result
  try {
    await db.syncLog.create({
      data: {
        platform,
        status,
        message,
        productsCount,
        ordersCount,
        customersCount,
        startedAt,
        completedAt,
      },
    });
  } catch (logError) {
    console.error(`[${platform}] Failed to log sync result:`, logError);
  }

  return {
    platform,
    status,
    message,
    productsCount,
    ordersCount,
    customersCount,
    startedAt,
    completedAt,
    duration,
  };
}

// =============================================================================
// SYNC ALL PLATFORMS
// =============================================================================

export async function syncAllPlatforms(): Promise<SyncResult[]> {
  const connectors = getAllConnectors();
  const results: SyncResult[] = [];

  // Run syncs in parallel, but each one is independently transactional
  // so a failure in one doesn't affect the others
  const promises = connectors.map((connector) =>
    syncPlatform(connector.platform)
  );

  const syncResults = await Promise.allSettled(promises);

  for (const result of syncResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      const error = result.reason;
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        platform: 'shopify' as Platform,
        status: 'failed',
        message,
        productsCount: 0,
        ordersCount: 0,
        customersCount: 0,
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 0,
      });
    }
  }

  return results;
}

// =============================================================================
// SYNC STATUS
// =============================================================================

export async function getSyncStatus(): Promise<
  Array<{
    platform: Platform;
    lastSyncedAt: Date | null;
    lastSyncStatus: 'success' | 'failed' | null;
    lastSyncMessage: string | null;
    productsCount: number;
    ordersCount: number;
    customersCount: number;
  }>
> {
  const latestLogs = await db.syncLog.findMany({
    distinct: ['platform'],
    orderBy: { startedAt: 'desc' },
  });

  return latestLogs.map((log) => ({
    platform: log.platform as Platform,
    lastSyncedAt: log.startedAt,
    lastSyncStatus: log.status as 'success' | 'failed',
    lastSyncMessage: log.message,
    productsCount: log.productsCount,
    ordersCount: log.ordersCount,
    customersCount: log.customersCount,
  }));
}
