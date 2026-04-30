import type {
  CanonicalProduct,
  CanonicalOrder,
  FinancialStatus,
  FulfillmentStatus,
} from "@/lib/types/canonical";
import type { Connector } from "./types";
import { toCents } from "./types";

// =============================================================================
// WOOCOMMERCE CONNECTOR (DUMMY)
// =============================================================================
// Hearth & Powder's regional/wholesale WooCommerce store. Carries a subset
// of Shopify SKUs at slightly lower B2B-style prices, plus a couple of
// Woo-only items (carry bag, leash) that the wholesale audience asks for.

interface WooProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string;
  regular_price: string;
  status: "publish" | "draft" | "private";
  stock_quantity: number | null;
  stock_status: "instock" | "outofstock" | "onbackorder";
  images: Array<{ src: string }>;
  categories: Array<{ name: string }>;
}

interface WooOrder {
  id: number;
  number: string;
  status:
    | "pending"
    | "processing"
    | "on-hold"
    | "completed"
    | "cancelled"
    | "refunded"
    | "failed";
  currency: string;
  date_created: string;
  date_paid: string | null;
  total: string;
  subtotal: string;
  total_tax: string;
  shipping_total: string;
  discount_total: string;
  customer_id: number;
  billing: { first_name: string; last_name: string; email: string };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    sku: string;
    quantity: number;
    price: number;
    total: string;
    subtotal: string;
  }>;
}

// Shared SKUs from Shopify at ~10% wholesale discount, plus Woo-only items
const DUMMY_PRODUCTS: WooProduct[] = [
  // Cross-listed with Shopify
  {
    id: 101,
    name: "Minimal Snowboard",
    slug: "minimal-snowboard",
    sku: "SB-MINIMAL",
    price: "795.00",
    regular_price: "885.95",
    status: "publish",
    stock_quantity: 22,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Snowboards" }],
  },
  {
    id: 102,
    name: "Complete Snowboard Package",
    slug: "complete-snowboard",
    sku: "SB-COMPLETE-1",
    price: "629.95",
    regular_price: "699.95",
    status: "publish",
    stock_quantity: 18,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Snowboards" }],
  },
  {
    id: 103,
    name: "Multi-location Snowboard",
    slug: "multi-location-snowboard",
    sku: "SB-MULTILOC",
    price: "659.00",
    regular_price: "729.95",
    status: "publish",
    stock_quantity: 14,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Snowboards" }],
  },
  {
    id: 104,
    name: "Hydrogen Collection Snowboard",
    slug: "hydrogen-snowboard",
    sku: "SB-COL-HYDROGEN",
    price: "540.00",
    regular_price: "600.00",
    status: "publish",
    stock_quantity: 9,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Snowboards" }],
  },
  {
    id: 105,
    name: "Multi-managed Snowboard",
    slug: "multi-managed-snowboard",
    sku: "SB-MULTIMG",
    price: "569.00",
    regular_price: "629.95",
    status: "publish",
    stock_quantity: 11,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Snowboards" }],
  },
  {
    id: 106,
    name: "Performance Ski Wax",
    slug: "ski-wax",
    sku: "SB-SKIWAX",
    price: "8.50",
    regular_price: "9.95",
    status: "publish",
    stock_quantity: 240,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Accessories" }],
  },

  // WooCommerce-only
  {
    id: 107,
    name: "Daily Driver Snowboard Bag, 165cm",
    slug: "daily-driver-bag",
    sku: "WC-BAG-DAILY",
    price: "79.00",
    regular_price: "89.00",
    status: "publish",
    stock_quantity: 35,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Accessories" }],
  },
  {
    id: 108,
    name: "Snowboard Leash, 25mm",
    slug: "leash-25mm",
    sku: "WC-LEASH-25M",
    price: "14.00",
    regular_price: "14.00",
    status: "publish",
    stock_quantity: 0,
    stock_status: "outofstock",
    images: [],
    categories: [{ name: "Accessories" }],
  },
  {
    id: 109,
    name: "Discontinued: Pre-2024 Wax",
    slug: "old-wax",
    sku: "WC-WAX-LEGACY",
    price: "5.00",
    regular_price: "5.00",
    status: "draft",
    stock_quantity: 0,
    stock_status: "outofstock",
    images: [],
    categories: [{ name: "Accessories" }],
  },
  // Wholesale listing of the cross-platform ProEdge release. Shares SKU
  // with Amazon and Etsy so anomaly detection aggregates across channels.
  {
    id: 110,
    name: "ProEdge Carbon Snowboard - Limited Release",
    slug: "proedge-carbon",
    sku: "SB-EDGE-PRO",
    price: "810.00",
    regular_price: "899.99",
    status: "publish",
    stock_quantity: 12,
    stock_status: "instock",
    images: [],
    categories: [{ name: "Snowboards" }],
  },
];

const DUMMY_ORDERS: WooOrder[] = generateDummyOrders();

function generateDummyOrders(): WooOrder[] {
  const orders: WooOrder[] = [];
  const now = Date.now();
  const customers = [
    {
      id: 5001,
      first_name: "Eleanor",
      last_name: "Vance",
      email: "evance@example.com",
    },
    {
      id: 5002,
      first_name: "Mateo",
      last_name: "Rivera",
      email: "mrivera@example.com",
    },
    {
      id: 5003,
      first_name: "Priya",
      last_name: "Sharma",
      email: "priya.s@example.com",
    },
    {
      id: 5004,
      first_name: "Jonas",
      last_name: "Berg",
      email: "jberg@example.com",
    },
    {
      id: 5005,
      first_name: "Tomoko",
      last_name: "Yamada",
      email: "t.yamada@example.com",
    },
    {
      id: 5006,
      first_name: "Carlos",
      last_name: "Mendoza",
      email: "cmendoza@example.com",
    },
  ];

  const activeProducts = DUMMY_PRODUCTS.filter(
    (p) => p.status === "publish" && p.stock_status === "instock",
  );

  for (let i = 0; i < 22; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const date = new Date(now - daysAgo * 86400000 - Math.random() * 86400000);
    const numItems = 1 + Math.floor(Math.random() * 3);
    const usedIds = new Set<number>();
    const lineItems: WooOrder["line_items"] = [];

    for (let j = 0; j < numItems; j++) {
      const candidates = activeProducts.filter((p) => !usedIds.has(p.id));
      if (candidates.length === 0) break;
      const product =
        candidates[Math.floor(Math.random() * candidates.length)]!;
      usedIds.add(product.id);
      const qty = 1 + Math.floor(Math.random() * 2);
      const unitPrice = parseFloat(product.price);
      const lineTotal = unitPrice * qty;
      lineItems.push({
        id: 10000 + i * 10 + j,
        name: product.name,
        product_id: product.id,
        sku: product.sku,
        quantity: qty,
        price: unitPrice,
        total: lineTotal.toFixed(2),
        subtotal: lineTotal.toFixed(2),
      });
    }

    const subtotal = lineItems.reduce((s, li) => s + parseFloat(li.total), 0);
    const tax = subtotal * 0.07;
    const shipping = subtotal >= 100 ? 0 : 12.5;
    const discount =
      Math.random() < 0.2 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
    const total = subtotal + tax + shipping - discount;

    const r = Math.random();
    let status: WooOrder["status"];
    if (r < 0.7) status = "completed";
    else if (r < 0.85) status = "processing";
    else if (r < 0.92) status = "on-hold";
    else if (r < 0.97) status = "refunded";
    else status = "cancelled";

    const customer = customers[Math.floor(Math.random() * customers.length)]!;

    orders.push({
      id: 2000 + i,
      number: `${2000 + i}`,
      status,
      currency: "USD",
      date_created: date.toISOString(),
      date_paid:
        status === "completed" || status === "processing"
          ? date.toISOString()
          : null,
      total: total.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total_tax: tax.toFixed(2),
      shipping_total: shipping.toFixed(2),
      discount_total: discount.toFixed(2),
      customer_id: customer.id,
      billing: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
      },
      line_items: lineItems,
    });
  }

  orders.push(...buildEdgeProAnomalyOrders());

  return orders.sort((a, b) => b.date_created.localeCompare(a.date_created));
}

// WooCommerce slice of the SB-EDGE-PRO anomaly: 4 recent (2 refunded) + 9
// baseline (0 refunded). See amazon.ts for the cross-platform totals.
function buildEdgeProAnomalyOrders(): WooOrder[] {
  const product = DUMMY_PRODUCTS.find((p) => p.sku === "SB-EDGE-PRO");
  if (!product) return [];

  const buyerPool = [
    {
      id: 5101,
      first_name: "Iris",
      last_name: "Holloway",
      email: "iholloway@example.com",
    },
    {
      id: 5102,
      first_name: "Daniel",
      last_name: "Park",
      email: "d.park@example.com",
    },
    {
      id: 5103,
      first_name: "Sage",
      last_name: "Romero",
      email: "sromero@example.com",
    },
    {
      id: 5104,
      first_name: "Hugo",
      last_name: "Brennan",
      email: "hbrennan@example.com",
    },
  ];

  type Spec = { daysAgo: number; status: WooOrder["status"] };
  const specs: Spec[] = [
    // Recent: 4 orders, 2 refunded
    { daysAgo: 1, status: "refunded" },
    { daysAgo: 3, status: "completed" },
    { daysAgo: 5, status: "refunded" },
    { daysAgo: 6, status: "completed" },
    // Baseline: 9 orders, 0 refunded
    { daysAgo: 9, status: "completed" },
    { daysAgo: 12, status: "completed" },
    { daysAgo: 15, status: "completed" },
    { daysAgo: 17, status: "completed" },
    { daysAgo: 20, status: "completed" },
    { daysAgo: 23, status: "completed" },
    { daysAgo: 25, status: "completed" },
    { daysAgo: 28, status: "completed" },
    { daysAgo: 30, status: "completed" },
  ];

  const now = Date.now();
  const unitPrice = parseFloat(product.price);

  return specs.map((spec, i) => {
    const date = new Date(
      now - spec.daysAgo * 86400000 - ((i * 13) % 24) * 3600000,
    );
    const buyer = buyerPool[i % buyerPool.length]!;
    const subtotal = unitPrice;
    const tax = subtotal * 0.07;
    const shipping = 0;
    const total = subtotal + tax + shipping;
    return {
      id: 9000 + i + 1,
      number: `${9000 + i + 1}`,
      status: spec.status,
      currency: "USD",
      date_created: date.toISOString(),
      date_paid:
        spec.status === "completed" || spec.status === "refunded"
          ? date.toISOString()
          : null,
      total: total.toFixed(2),
      subtotal: subtotal.toFixed(2),
      total_tax: tax.toFixed(2),
      shipping_total: shipping.toFixed(2),
      discount_total: "0.00",
      customer_id: buyer.id,
      billing: {
        first_name: buyer.first_name,
        last_name: buyer.last_name,
        email: buyer.email,
      },
      line_items: [
        {
          id: 12000 + i + 1,
          name: product.name,
          product_id: product.id,
          sku: product.sku,
          quantity: 1,
          price: unitPrice,
          total: subtotal.toFixed(2),
          subtotal: subtotal.toFixed(2),
        },
      ],
    };
  });
}

function mapWooStatus(s: WooOrder["status"]): {
  financial: FinancialStatus;
  fulfillment: FulfillmentStatus;
} {
  switch (s) {
    case "completed":
      return { financial: "paid", fulfillment: "fulfilled" };
    case "processing":
      return { financial: "paid", fulfillment: "unfulfilled" };
    case "on-hold":
    case "pending":
      return { financial: "pending", fulfillment: "unfulfilled" };
    case "refunded":
      return { financial: "refunded", fulfillment: "fulfilled" };
    case "cancelled":
    case "failed":
      return { financial: "cancelled", fulfillment: "unfulfilled" };
  }
}

async function fetchProducts(): Promise<CanonicalProduct[]> {
  await sleep(40);
  return DUMMY_PRODUCTS.map((p) => ({
    platform: "woocommerce" as const,
    platformProductId: String(p.id),
    title: p.name,
    vendor: p.categories[0]?.name,
    sku: p.sku,
    priceAmount: toCents(p.price),
    priceCurrency: "USD",
    inventoryQty: p.stock_quantity ?? 0,
    status:
      p.status === "publish"
        ? "active"
        : p.status === "draft"
          ? "draft"
          : "archived",
    imageUrl: p.images[0]?.src,
    rawData: p,
  }));
}

async function fetchOrders(): Promise<CanonicalOrder[]> {
  await sleep(40);
  return DUMMY_ORDERS.map((o) => {
    const { financial, fulfillment } = mapWooStatus(o.status);
    return {
      platform: "woocommerce" as const,
      platformOrderId: String(o.id),
      orderNumber: `#${o.number}`,
      totalAmount: toCents(o.total),
      subtotalAmount: toCents(o.subtotal),
      taxAmount: toCents(o.total_tax),
      shippingAmount: toCents(o.shipping_total),
      discountAmount: toCents(o.discount_total),
      currency: o.currency,
      financialStatus: financial,
      fulfillmentStatus: fulfillment,
      customer: {
        platform: "woocommerce" as const,
        platformCustomerId: String(o.customer_id),
        email: o.billing.email,
        firstName: o.billing.first_name,
        lastName: o.billing.last_name,
      },
      customerEmail: o.billing.email,
      placedAt: new Date(o.date_created),
      items: o.line_items.map((li) => ({
        title: li.name,
        sku: li.sku,
        quantity: li.quantity,
        unitPrice: Math.round(li.price * 100),
        totalPrice: toCents(li.total),
        rawData: li,
      })),
      rawData: o,
    };
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const wooCommerceConnector: Connector = {
  platform: "woocommerce",
  fetchProducts,
  fetchOrders,
};
