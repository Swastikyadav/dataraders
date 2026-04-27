// =============================================================================
// CANONICAL TYPES
// =============================================================================
// Platform-agnostic data transfer objects returned by every connector.
// These mirror the Prisma schema but carry no DB concerns and no canonical IDs
// (those are assigned at insert time by the sync layer).
//
// Invariants enforced at the type level:
//   - Money is integer minor units (cents)
//   - Status fields are constrained to canonical vocabularies
//   - Timestamps are Date instances (UTC)
// =============================================================================

export type Platform = "shopify" | "amazon" | "woocommerce" | "etsy";

export type FinancialStatus = "paid" | "pending" | "refunded" | "cancelled";
export type FulfillmentStatus = "fulfilled" | "partial" | "unfulfilled";
export type ProductStatus = "active" | "draft" | "archived";

export interface CanonicalProduct {
  platform: Platform;
  platformProductId: string;
  title: string;
  vendor?: string;
  sku?: string;
  priceAmount: number; // cents
  priceCurrency: string; // ISO 4217 code (USD, EUR, etc.)
  inventoryQty: number;
  status: ProductStatus;
  imageUrl?: string;
  rawData?: unknown; // original platform payload, JSON-serializable
}

export interface CanonicalCustomer {
  platform: Platform;
  platformCustomerId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  rawData?: unknown;
}

export interface CanonicalOrderItem {
  // Line items are identified within the order by SKU + position.
  // Platform-specific line item IDs go into rawData.
  title: string;
  sku?: string;
  quantity: number;
  unitPrice: number; // cents
  totalPrice: number; // cents (after item-level discounts)
  rawData?: unknown;
}

export interface CanonicalOrder {
  platform: Platform;
  platformOrderId: string;
  orderNumber: string; // human-readable: "#1011", "AMZ-1234567", etc.

  totalAmount: number; // cents (final paid amount)
  subtotalAmount?: number;
  taxAmount?: number;
  shippingAmount?: number;
  discountAmount?: number;
  currency: string;

  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;

  // Customer is embedded in the order. The sync layer is responsible for
  // upserting the Customer record and linking it. This keeps the connector
  // contract simple: "give me one order with everything I need."
  customer?: CanonicalCustomer;
  customerEmail?: string;

  placedAt: Date;
  items: CanonicalOrderItem[];
  rawData?: unknown;
}
