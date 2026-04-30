import type {
  CanonicalProduct,
  CanonicalOrder,
  FinancialStatus,
  FulfillmentStatus,
} from "@/lib/types/canonical";
import type { Connector } from "./types";
import { toCents } from "./types";

// =============================================================================
// AMAZON CONNECTOR (DUMMY)
// =============================================================================
// "Hearth & Powder Co." — bestsellers from the Shopify catalog plus a couple
// of Amazon-exclusive ski accessories. Titles are slightly altered from
// Shopify (Amazon SEO style) but SKUs match exactly so cross-platform
// product analytics work.

interface AmazonSpApiOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus:
    | "Pending"
    | "Unshipped"
    | "PartiallyShipped"
    | "Shipped"
    | "Canceled"
    | "Unfulfillable"
    | "Refunded";
  OrderTotal: { CurrencyCode: string; Amount: string };
  BuyerInfo?: { BuyerEmail?: string; BuyerName?: string };
  Items: Array<{
    ASIN: string;
    SellerSKU: string;
    Title: string;
    QuantityOrdered: number;
    ItemPrice: { CurrencyCode: string; Amount: string };
    ItemTax?: { CurrencyCode: string; Amount: string };
  }>;
}

interface AmazonSpApiProduct {
  ASIN: string;
  SellerSKU: string;
  Title: string;
  Brand?: string;
  Status: "Active" | "Inactive" | "Incomplete";
  Price: { Amount: string; CurrencyCode: string };
  FulfillmentAvailability?: { Quantity: number };
  ImageUrl?: string;
}

// ----- Dummy data ------------------------------------------------------------
// Shared SKUs from Shopify (Amazon prices are ~5% lower — realistic for a
// channel where the merchant absorbs Amazon fees) plus 2 Amazon-only items.

const DUMMY_PRODUCTS: AmazonSpApiProduct[] = [
  // Cross-listed with Shopify
  {
    ASIN: "B0C7H8K9M1",
    SellerSKU: "SB-MINIMAL",
    Title: "Hearth & Powder Minimal Snowboard - All-Mountain Freeride",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "849.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 42 },
  },
  {
    ASIN: "B0DF3K2L9X",
    SellerSKU: "SB-COMPLETE-1",
    Title: "Hearth & Powder Complete Snowboard Package with Bindings",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "659.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 28 },
  },
  {
    ASIN: "B0BXYZ4567",
    SellerSKU: "SB-VIDEO",
    Title: "Hearth & Powder Videographer Pro Snowboard - Park & Pipe",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "839.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 19 },
  },
  {
    ASIN: "B0HQR8N5K2",
    SellerSKU: "SB-COL-OXYGEN",
    Title: "Hearth & Powder Oxygen Collection Snowboard - Premium Powder",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "979.00", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 12 },
  },
  {
    ASIN: "B0LM2P9Q3R",
    SellerSKU: "SB-COMPARE",
    Title: "Hearth & Powder All-Terrain Snowboard - Adult Freestyle",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "729.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 35 },
  },
  {
    ASIN: "B0SKIWAX01",
    SellerSKU: "SB-SKIWAX",
    Title: "Hearth & Powder Performance Ski & Snowboard Wax - All Temperatures",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "8.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 412 },
  },

  // Amazon-only
  {
    ASIN: "B0GOGGLES1",
    SellerSKU: "AMZ-GOGGLES-PRO",
    Title: "Pro Series Anti-Fog Snow Goggles, UV400 Polarized Lens",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "64.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 156 },
  },
  {
    ASIN: "B0GLOVESM1",
    SellerSKU: "AMZ-GLOVES-INS",
    Title: "Insulated Waterproof Snowboard Gloves, Touchscreen Compatible",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "42.50", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 88 },
  },

  // Limited release with a recently-discovered binding-mount defect — drives
  // the cross-platform return-rate anomaly shown on the dashboard banner.
  {
    ASIN: "B0EDGE9PRO9",
    SellerSKU: "SB-EDGE-PRO",
    Title: "Hearth & Powder ProEdge Carbon Snowboard - Limited Release",
    Brand: "Hearth & Powder",
    Status: "Active",
    Price: { Amount: "899.99", CurrencyCode: "USD" },
    FulfillmentAvailability: { Quantity: 18 },
  },
];

const DUMMY_ORDERS: AmazonSpApiOrder[] = generateDummyOrders();

function generateDummyOrders(): AmazonSpApiOrder[] {
  const orders: AmazonSpApiOrder[] = [];
  const now = Date.now();
  const buyers: Array<{ email: string; name: string } | null> = [
    { email: "a.chen@example.com", name: "Alice Chen" },
    { email: "rmurphy@example.com", name: "Ryan Murphy" },
    { email: "sk.patel@example.com", name: "Sneha Patel" },
    { email: "jdoe@example.com", name: "James Doe" },
    { email: "mklein@example.com", name: "Maria Klein" },
    { email: "tanderson@example.com", name: "Tom Anderson" },
    null, // some orders have buyer info redacted
  ];

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now - daysAgo * 86400000 - Math.random() * 86400000);
    const numItems = 1 + Math.floor(Math.random() * 2); // Amazon orders skew smaller
    const usedAsins = new Set<string>();
    const items: AmazonSpApiOrder["Items"] = [];

    for (let j = 0; j < numItems; j++) {
      const candidates = DUMMY_PRODUCTS.filter(
        (p) => p.Status === "Active" && !usedAsins.has(p.ASIN),
      );
      if (candidates.length === 0) break;
      const product =
        candidates[Math.floor(Math.random() * candidates.length)]!;
      usedAsins.add(product.ASIN);
      const qty = 1 + Math.floor(Math.random() * 2);
      const unitPrice = parseFloat(product.Price.Amount);
      items.push({
        ASIN: product.ASIN,
        SellerSKU: product.SellerSKU,
        Title: product.Title,
        QuantityOrdered: qty,
        ItemPrice: {
          CurrencyCode: "USD",
          Amount: (unitPrice * qty).toFixed(2),
        },
        ItemTax: {
          CurrencyCode: "USD",
          Amount: (unitPrice * qty * 0.08).toFixed(2),
        },
      });
    }

    const subtotal = items.reduce(
      (s, it) => s + parseFloat(it.ItemPrice.Amount),
      0,
    );
    const tax = items.reduce(
      (s, it) => s + parseFloat(it.ItemTax?.Amount ?? "0"),
      0,
    );
    const total = subtotal + tax;

    const r = Math.random();
    let status: AmazonSpApiOrder["OrderStatus"] = "Shipped";
    if (r < 0.03) status = "Canceled";
    else if (r < 0.05) status = "Pending";
    else if (r < 0.08) status = "Unshipped";

    const buyer = buyers[Math.floor(Math.random() * buyers.length)];

    orders.push({
      AmazonOrderId: `114-${randomDigits(7)}-${randomDigits(7)}`,
      PurchaseDate: date.toISOString(),
      OrderStatus: status,
      OrderTotal: { CurrencyCode: "USD", Amount: total.toFixed(2) },
      BuyerInfo: buyer
        ? { BuyerEmail: buyer.email, BuyerName: buyer.name }
        : undefined,
      Items: items,
    });
  }

  orders.push(...buildEdgeProAnomalyOrders());

  return orders.sort((a, b) => b.PurchaseDate.localeCompare(a.PurchaseDate));
}

// SB-EDGE-PRO seed: 5 recent orders (2 refunded) + 10 baseline orders (0
// refunded). Combined with the Etsy and WooCommerce seeds for the same SKU
// this produces a 12-order recent window with 5 refunds vs a 25-order
// baseline with 0 refunds — well above the SPIKE_RATIO threshold.
function buildEdgeProAnomalyOrders(): AmazonSpApiOrder[] {
  const product = DUMMY_PRODUCTS.find((p) => p.SellerSKU === "SB-EDGE-PRO");
  if (!product) return [];

  const unitPrice = parseFloat(product.Price.Amount);
  const tax = unitPrice * 0.08;
  const grandTotal = unitPrice + tax;

  const buyerPool = [
    { email: "qa.aoki@example.com", name: "Quinn Aoki" },
    { email: "lwhitney@example.com", name: "Lucas Whitney" },
    { email: "mhsu@example.com", name: "Mira Hsu" },
    { email: "rdiazpark@example.com", name: "Roman Diaz-Park" },
    { email: "spatel.ed@example.com", name: "Sasha Patel" },
  ];

  type Spec = { daysAgo: number; status: AmazonSpApiOrder["OrderStatus"] };
  const specs: Spec[] = [
    // Recent window: 5 orders, 2 refunded
    { daysAgo: 1, status: "Refunded" },
    { daysAgo: 2, status: "Shipped" },
    { daysAgo: 3, status: "Refunded" },
    { daysAgo: 5, status: "Shipped" },
    { daysAgo: 6, status: "Shipped" },
    // Baseline window: 10 orders, 0 refunded
    { daysAgo: 9, status: "Shipped" },
    { daysAgo: 11, status: "Shipped" },
    { daysAgo: 13, status: "Shipped" },
    { daysAgo: 15, status: "Shipped" },
    { daysAgo: 17, status: "Shipped" },
    { daysAgo: 19, status: "Shipped" },
    { daysAgo: 22, status: "Shipped" },
    { daysAgo: 25, status: "Shipped" },
    { daysAgo: 27, status: "Shipped" },
    { daysAgo: 29, status: "Shipped" },
  ];

  const now = Date.now();

  return specs.map((spec, i) => {
    const date = new Date(
      now - spec.daysAgo * 86400000 - ((i * 11) % 24) * 3600000,
    );
    const buyer = buyerPool[i % buyerPool.length]!;
    return {
      AmazonOrderId: `114-EDGE-${String(i + 1).padStart(7, "0")}`,
      PurchaseDate: date.toISOString(),
      OrderStatus: spec.status,
      OrderTotal: { CurrencyCode: "USD", Amount: grandTotal.toFixed(2) },
      BuyerInfo: { BuyerEmail: buyer.email, BuyerName: buyer.name },
      Items: [
        {
          ASIN: product.ASIN,
          SellerSKU: product.SellerSKU,
          Title: product.Title,
          QuantityOrdered: 1,
          ItemPrice: { CurrencyCode: "USD", Amount: unitPrice.toFixed(2) },
          ItemTax: { CurrencyCode: "USD", Amount: tax.toFixed(2) },
        },
      ],
    };
  });
}

function randomDigits(n: number): string {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join(
    "",
  );
}

function mapAmazonOrderStatus(s: AmazonSpApiOrder["OrderStatus"]): {
  financial: FinancialStatus;
  fulfillment: FulfillmentStatus;
} {
  switch (s) {
    case "Shipped":
      return { financial: "paid", fulfillment: "fulfilled" };
    case "PartiallyShipped":
      return { financial: "paid", fulfillment: "partial" };
    case "Unshipped":
      return { financial: "paid", fulfillment: "unfulfilled" };
    case "Canceled":
      return { financial: "cancelled", fulfillment: "unfulfilled" };
    case "Pending":
      return { financial: "pending", fulfillment: "unfulfilled" };
    case "Unfulfillable":
      return { financial: "paid", fulfillment: "unfulfilled" };
    case "Refunded":
      return { financial: "refunded", fulfillment: "fulfilled" };
  }
}

async function fetchProducts(): Promise<CanonicalProduct[]> {
  await sleep(50);
  return DUMMY_PRODUCTS.map((p) => ({
    platform: "amazon" as const,
    platformProductId: p.ASIN,
    title: p.Title,
    vendor: p.Brand,
    sku: p.SellerSKU,
    priceAmount: toCents(p.Price.Amount),
    priceCurrency: p.Price.CurrencyCode,
    inventoryQty: p.FulfillmentAvailability?.Quantity ?? 0,
    status:
      p.Status === "Active"
        ? "active"
        : p.Status === "Inactive"
          ? "archived"
          : "draft",
    imageUrl: p.ImageUrl,
    rawData: p,
  }));
}

async function fetchOrders(): Promise<CanonicalOrder[]> {
  await sleep(50);
  return DUMMY_ORDERS.map((o) => {
    const { financial, fulfillment } = mapAmazonOrderStatus(o.OrderStatus);
    const subtotal = o.Items.reduce(
      (s, it) => s + toCents(it.ItemPrice.Amount),
      0,
    );
    const tax = o.Items.reduce(
      (s, it) => s + toCents(it.ItemTax?.Amount ?? "0"),
      0,
    );

    let firstName: string | undefined;
    let lastName: string | undefined;
    if (o.BuyerInfo?.BuyerName) {
      const parts = o.BuyerInfo.BuyerName.split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(" ") || undefined;
    }

    const customer = o.BuyerInfo
      ? {
          platform: "amazon" as const,
          platformCustomerId:
            o.BuyerInfo.BuyerEmail ?? `anon-${o.AmazonOrderId}`,
          email: o.BuyerInfo.BuyerEmail,
          firstName,
          lastName,
        }
      : undefined;

    return {
      platform: "amazon" as const,
      platformOrderId: o.AmazonOrderId,
      orderNumber: o.AmazonOrderId,
      totalAmount: toCents(o.OrderTotal.Amount),
      subtotalAmount: subtotal,
      taxAmount: tax,
      shippingAmount: 0,
      discountAmount: 0,
      currency: o.OrderTotal.CurrencyCode,
      financialStatus: financial,
      fulfillmentStatus: fulfillment,
      customer,
      customerEmail: o.BuyerInfo?.BuyerEmail,
      placedAt: new Date(o.PurchaseDate),
      items: o.Items.map((it) => ({
        title: it.Title,
        sku: it.SellerSKU,
        quantity: it.QuantityOrdered,
        unitPrice: Math.round(
          toCents(it.ItemPrice.Amount) / it.QuantityOrdered,
        ),
        totalPrice: toCents(it.ItemPrice.Amount),
        rawData: it,
      })),
      rawData: o,
    };
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const amazonConnector: Connector = {
  platform: "amazon",
  fetchProducts,
  fetchOrders,
};
