import type {
  CanonicalProduct,
  CanonicalOrder,
  FinancialStatus,
  FulfillmentStatus,
} from "@/lib/types/canonical";
import type { Connector } from "./types";

// =============================================================================
// ETSY CONNECTOR (DUMMY)
// =============================================================================
// Hearth & Powder's Etsy presence is the artisan/handcraft side: custom
// decals, hand-painted boards, vintage gear. Different audience, no SKU
// overlap with Shopify — Etsy products are intentionally exclusive to that
// channel. The dashboard demonstrates that some products are channel-only.

interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

interface EtsyListing {
  listing_id: number;
  title: string;
  state: "active" | "inactive" | "sold_out" | "expired" | "draft";
  quantity: number;
  price: EtsyMoney;
  sku: string[];
  url: string;
  shop_section_id: number | null;
  images: Array<{ url_570xN: string }>;
}

interface EtsyReceipt {
  receipt_id: number;
  status:
    | "open"
    | "unshipped"
    | "shipped"
    | "paid"
    | "completed"
    | "fully_refunded"
    | "partially_refunded";
  is_paid: boolean;
  is_shipped: boolean;
  buyer_email: string;
  name: string;
  grandtotal: EtsyMoney;
  subtotal: EtsyMoney;
  total_tax_cost: EtsyMoney;
  total_shipping_cost: EtsyMoney;
  discount_amt: EtsyMoney;
  created_timestamp: number;
  transactions: Array<{
    transaction_id: number;
    title: string;
    sku: string;
    quantity: number;
    price: EtsyMoney;
    listing_id: number;
  }>;
}

const DUMMY_LISTINGS: EtsyListing[] = [
  {
    listing_id: 1620304501,
    title: "Custom Vinyl Snowboard Decal — Your Name & Mountain",
    state: "active",
    quantity: 50,
    price: { amount: 2500, divisor: 100, currency_code: "USD" },
    sku: ["ET-DECAL-CUSTOM"],
    url: "https://etsy.com/listing/1620304501",
    shop_section_id: 12,
    images: [],
  },
  {
    listing_id: 1620304502,
    title: "Vintage 1990s Snowboard Reproduction — Hand-Restored",
    state: "active",
    quantity: 4,
    price: { amount: 48000, divisor: 100, currency_code: "USD" },
    sku: ["ET-VINTAGE-90S"],
    url: "https://etsy.com/listing/1620304502",
    shop_section_id: 13,
    images: [],
  },
  {
    listing_id: 1620304503,
    title: "Hand-Painted Snowboard — Aurora Borealis Series",
    state: "active",
    quantity: 2,
    price: { amount: 95000, divisor: 100, currency_code: "USD" },
    sku: ["ET-HANDPAINT-A"],
    url: "https://etsy.com/listing/1620304503",
    shop_section_id: 14,
    images: [],
  },
  {
    listing_id: 1620304504,
    title: "Hand-Painted Snowboard — Mountain Sunset Series",
    state: "active",
    quantity: 3,
    price: { amount: 85000, divisor: 100, currency_code: "USD" },
    sku: ["ET-HANDPAINT-B"],
    url: "https://etsy.com/listing/1620304504",
    shop_section_id: 14,
    images: [],
  },
  {
    listing_id: 1620304505,
    title: "Sticker Pack — Vintage Snowboard Brands, Set of 12",
    state: "active",
    quantity: 75,
    price: { amount: 1200, divisor: 100, currency_code: "USD" },
    sku: ["ET-STICKER-PK"],
    url: "https://etsy.com/listing/1620304505",
    shop_section_id: 12,
    images: [],
  },
  {
    listing_id: 1620304506,
    title: "Limited Edition: Hand-Painted Wave Series Snowboard",
    state: "sold_out",
    quantity: 0,
    price: { amount: 110000, divisor: 100, currency_code: "USD" },
    sku: ["ET-LTD-WAVE"],
    url: "https://etsy.com/listing/1620304506",
    shop_section_id: 15,
    images: [],
  },
];

const DUMMY_RECEIPTS: EtsyReceipt[] = generateDummyReceipts();

function generateDummyReceipts(): EtsyReceipt[] {
  const receipts: EtsyReceipt[] = [];
  const now = Date.now();
  const buyers = [
    { name: "Naomi Tanaka", email: "n.tanaka@example.com" },
    { name: "Lukas Schmidt", email: "lschmidt@example.com" },
    { name: "Aisha Williams", email: "aw.williams@example.com" },
    { name: "François Dubois", email: "fdubois@example.com" },
    { name: "Hannah Cooper", email: "hcooper@example.com" },
    { name: "Yuki Nakamura", email: "y.nakamura@example.com" },
  ];

  const activeListings = DUMMY_LISTINGS.filter((l) => l.state === "active");

  for (let i = 0; i < 18; i++) {
    const daysAgo = Math.floor(Math.random() * 60);
    const ts = Math.floor(
      (now - daysAgo * 86400000 - Math.random() * 86400000) / 1000,
    );
    const numItems = Math.random() < 0.6 ? 1 : 2;
    const usedIds = new Set<number>();
    const transactions: EtsyReceipt["transactions"] = [];

    for (let j = 0; j < numItems; j++) {
      const candidates = activeListings.filter(
        (l) => !usedIds.has(l.listing_id),
      );
      if (candidates.length === 0) break;
      const listing =
        candidates[Math.floor(Math.random() * candidates.length)]!;
      usedIds.add(listing.listing_id);
      transactions.push({
        transaction_id: 9000000 + i * 10 + j,
        title: listing.title,
        sku: listing.sku[0] ?? "",
        quantity: 1,
        price: { ...listing.price },
        listing_id: listing.listing_id,
      });
    }

    const subtotalCents = transactions.reduce(
      (s, t) =>
        s + Math.round((t.price.amount / t.price.divisor) * 100) * t.quantity,
      0,
    );
    const taxCents = 0;
    const shippingCents = Math.round((4.95 + Math.random() * 5) * 100);
    const discountCents =
      Math.random() < 0.15 ? Math.round(subtotalCents * 0.1) : 0;
    const totalCents = subtotalCents + taxCents + shippingCents - discountCents;

    const r = Math.random();
    let status: EtsyReceipt["status"];
    if (r < 0.65) status = "completed";
    else if (r < 0.85) status = "shipped";
    else if (r < 0.95) status = "paid";
    else status = "fully_refunded";

    const buyer = buyers[Math.floor(Math.random() * buyers.length)]!;

    receipts.push({
      receipt_id: 3000000000 + i,
      status,
      is_paid: true,
      is_shipped: status === "shipped" || status === "completed",
      buyer_email: buyer.email,
      name: buyer.name,
      grandtotal: { amount: totalCents, divisor: 100, currency_code: "USD" },
      subtotal: { amount: subtotalCents, divisor: 100, currency_code: "USD" },
      total_tax_cost: { amount: taxCents, divisor: 100, currency_code: "USD" },
      total_shipping_cost: {
        amount: shippingCents,
        divisor: 100,
        currency_code: "USD",
      },
      discount_amt: {
        amount: discountCents,
        divisor: 100,
        currency_code: "USD",
      },
      created_timestamp: ts,
      transactions,
    });
  }

  return receipts.sort((a, b) => b.created_timestamp - a.created_timestamp);
}

function etsyMoneyToCents(m: EtsyMoney): number {
  return Math.round((m.amount / m.divisor) * 100);
}

function mapEtsyStatus(s: EtsyReceipt["status"]): {
  financial: FinancialStatus;
  fulfillment: FulfillmentStatus;
} {
  switch (s) {
    case "completed":
      return { financial: "paid", fulfillment: "fulfilled" };
    case "shipped":
      return { financial: "paid", fulfillment: "fulfilled" };
    case "paid":
    case "unshipped":
      return { financial: "paid", fulfillment: "unfulfilled" };
    case "fully_refunded":
      return { financial: "refunded", fulfillment: "fulfilled" };
    case "partially_refunded":
      return { financial: "refunded", fulfillment: "partial" };
    case "open":
      return { financial: "pending", fulfillment: "unfulfilled" };
  }
}

async function fetchProducts(): Promise<CanonicalProduct[]> {
  await sleep(60);
  return DUMMY_LISTINGS.map((l) => ({
    platform: "etsy" as const,
    platformProductId: String(l.listing_id),
    title: l.title,
    vendor: undefined,
    sku: l.sku[0],
    priceAmount: etsyMoneyToCents(l.price),
    priceCurrency: l.price.currency_code,
    inventoryQty: l.quantity,
    status:
      l.state === "active"
        ? "active"
        : l.state === "draft"
          ? "draft"
          : "archived",
    imageUrl: l.images[0]?.url_570xN,
    rawData: l,
  }));
}

async function fetchOrders(): Promise<CanonicalOrder[]> {
  await sleep(60);
  return DUMMY_RECEIPTS.map((r) => {
    const { financial, fulfillment } = mapEtsyStatus(r.status);
    const [firstName, ...rest] = r.name.split(/\s+/);
    return {
      platform: "etsy" as const,
      platformOrderId: String(r.receipt_id),
      orderNumber: `Etsy-${r.receipt_id}`,
      totalAmount: etsyMoneyToCents(r.grandtotal),
      subtotalAmount: etsyMoneyToCents(r.subtotal),
      taxAmount: etsyMoneyToCents(r.total_tax_cost),
      shippingAmount: etsyMoneyToCents(r.total_shipping_cost),
      discountAmount: etsyMoneyToCents(r.discount_amt),
      currency: r.grandtotal.currency_code,
      financialStatus: financial,
      fulfillmentStatus: fulfillment,
      customer: {
        platform: "etsy" as const,
        platformCustomerId: r.buyer_email,
        email: r.buyer_email,
        firstName,
        lastName: rest.join(" ") || undefined,
      },
      customerEmail: r.buyer_email,
      placedAt: new Date(r.created_timestamp * 1000),
      items: r.transactions.map((t) => ({
        title: t.title,
        sku: t.sku,
        quantity: t.quantity,
        unitPrice: etsyMoneyToCents(t.price),
        totalPrice: etsyMoneyToCents(t.price) * t.quantity,
        rawData: t,
      })),
      rawData: r,
    };
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const etsyConnector: Connector = {
  platform: "etsy",
  fetchProducts,
  fetchOrders,
};
