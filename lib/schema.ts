// =============================================================================
// CANONICAL DATA MODEL TYPES
// =============================================================================
// Platform-agnostic representations of products, customers, orders, and line items.
// Every entity has an internal ID, a back-reference to its source platform,
// and the original raw payload preserved.

export type Money = number; // always cents, never floats

export type Platform = 'shopify' | 'amazon' | 'woocommerce' | 'etsy';

export type FinancialStatus = 'paid' | 'pending' | 'refunded' | 'cancelled';

export type FulfillmentStatus =
  | 'pending'
  | 'shipped'
  | 'unshipped'
  | 'processing'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type ProductStatus = 'active' | 'inactive' | 'archived';

// Platform vocabulary mappings to canonical status values
export const FINANCIAL_STATUS_MAP: Record<
  Platform,
  Record<string, FinancialStatus>
> = {
  shopify: {
    AUTHORIZED: 'pending',
    PENDING: 'pending',
    PAID: 'paid',
    PARTIALLY_PAID: 'pending',
    REFUNDED: 'refunded',
    VOIDED: 'cancelled',
    PARTIALLY_REFUNDED: 'pending', // conservative: treat as pending if any refund
  },
  amazon: {
    Pending: 'pending',
    Unshipped: 'pending',
    PartiallyShipped: 'pending',
    Shipped: 'paid',
    Canceled: 'cancelled',
    Unfulfillable: 'cancelled',
  },
  woocommerce: {
    pending: 'pending',
    processing: 'pending',
    'on-hold': 'pending',
    completed: 'paid',
    cancelled: 'cancelled',
    refunded: 'refunded',
    failed: 'cancelled',
  },
  etsy: {
    open: 'pending',
    unshipped: 'pending',
    shipped: 'paid',
    paid: 'paid',
    completed: 'paid',
    fully_refunded: 'refunded',
    partially_refunded: 'pending',
  },
};

export const FULFILLMENT_STATUS_MAP: Record<
  Platform,
  Record<string, FulfillmentStatus>
> = {
  shopify: {
    FULFILLED: 'shipped',
    PARTIAL: 'processing',
    UNCONFIRMED: 'pending',
    UNSHIPPED: 'unshipped',
    UNFULFILLED: 'unshipped',
    RESTOCKED: 'pending',
    ON_DEMAND: 'processing',
    SCHEDULED: 'processing',
  },
  amazon: {
    Shipped: 'shipped',
    Unshipped: 'unshipped',
    PartiallyShipped: 'processing',
    Canceled: 'cancelled',
    Unfulfillable: 'cancelled',
    Pending: 'pending',
  },
  woocommerce: {
    completed: 'delivered',
    processing: 'processing',
    'on-hold': 'pending',
    pending: 'pending',
    cancelled: 'cancelled',
    refunded: 'refunded',
    failed: 'cancelled',
  },
  etsy: {
    open: 'pending',
    unshipped: 'unshipped',
    shipped: 'shipped',
    paid: 'pending',
    completed: 'delivered',
    fully_refunded: 'cancelled',
    partially_refunded: 'processing',
  },
};

// =============================================================================
// CANONICAL ENTITIES
// =============================================================================

export interface CanonicalProduct {
  id: string; // internal UUID
  platform: Platform;
  platformId: string; // ASIN, product_id, listing_id, gid://shopify/Product/..., etc.
  title: string;
  sku: string | null; // merchant's SKU, cross-platform key
  description: string | null;
  price: Money; // in cents
  currency: string;
  inventory: number | null;
  status: ProductStatus;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  rawData: Record<string, unknown>; // original platform payload
}

export interface CanonicalCustomer {
  id: string; // internal UUID
  platform: Platform;
  platformId: string; // customer ID on platform
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: Date;
  updatedAt: Date;
  rawData: Record<string, unknown>;
}

export interface CanonicalOrder {
  id: string; // internal UUID
  platform: Platform;
  platformId: string; // order number/ID on platform
  customerId: string | null; // references CanonicalCustomer.id
  customerEmail: string | null; // denormalized for queries
  financialStatus: FinancialStatus;
  fulfillmentStatus: FulfillmentStatus;
  subtotal: Money; // in cents, before tax/shipping/discount
  tax: Money;
  shipping: Money;
  discount: Money;
  total: Money; // subtotal + tax + shipping - discount
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  rawData: Record<string, unknown>;
}

export interface CanonicalLineItem {
  id: string; // internal UUID
  orderId: string; // references CanonicalOrder.id
  productId: string | null; // references CanonicalProduct.id
  platform: Platform;
  sku: string | null; // denormalized from purchase time for historical accuracy
  title: string;
  quantity: number;
  unitPrice: Money; // price per unit in cents
  total: Money; // quantity * unitPrice
  rawData: Record<string, unknown>;
}

export interface SyncState {
  platform: Platform;
  lastSyncedAt: Date | null;
  lastSyncStatus: 'success' | 'failed' | null;
  lastSyncMessage: string | null;
  productsCount: number;
  ordersCount: number;
  customersCount: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getFinancialStatusForPlatform(
  platform: Platform,
  platformStatus: string
): FinancialStatus {
  return FINANCIAL_STATUS_MAP[platform][platformStatus] || 'pending';
}

export function getFulfillmentStatusForPlatform(
  platform: Platform,
  platformStatus: string
): FulfillmentStatus {
  return FULFILLMENT_STATUS_MAP[platform][platformStatus] || 'pending';
}

export function parseMoneyAsInteger(value: string | number): Money {
  if (typeof value === 'number') return Math.round(value);
  const parsed = parseFloat(value.trim());
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function moneyToString(money: Money): string {
  return (money / 100).toFixed(2);
}
