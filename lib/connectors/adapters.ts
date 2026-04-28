// =============================================================================
// CONNECTOR ADAPTERS
// =============================================================================
// Transform platform-specific data into canonical types.
// Pure functions with no side effects — easy to test and reuse.

import {
  CanonicalProduct,
  CanonicalCustomer,
  CanonicalOrder,
  CanonicalLineItem,
  Platform,
  parseMoneyAsInteger,
  getFinancialStatusForPlatform,
  getFulfillmentStatusForPlatform,
} from '@/lib/schema';

// =============================================================================
// SHOPIFY ADAPTERS
// =============================================================================

export interface ShopifyProduct {
  id: string;
  title: string;
  vendor: string | null;
  status: string;
  totalInventory: number | null;
  featuredImage: { url: string } | null;
  variants: { edges: Array<{ node: { sku: string | null } }> };
  priceRangeV2: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
}

export interface ShopifyLineItem {
  title: string;
  sku: string | null;
  quantity: number;
  originalUnitPriceSet: { shopMoney: { amount: string } };
  discountedTotalSet: { shopMoney: { amount: string } };
}

export interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  currentSubtotalPriceSet: { shopMoney: { amount: string } };
  currentTotalTaxSet: { shopMoney: { amount: string } } | null;
  totalShippingPriceSet: { shopMoney: { amount: string } };
  currentTotalDiscountsSet: { shopMoney: { amount: string } };
  customer: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  email: string | null;
  lineItems: { edges: Array<{ node: ShopifyLineItem }> };
}

export function shopifyProductToCanonical(
  product: ShopifyProduct,
  shop: string
): CanonicalProduct {
  const variants = product.variants.edges.map((e) => e.node);
  const sku = variants[0]?.sku || null;
  const price = parseMoneyAsInteger(
    product.priceRangeV2.minVariantPrice.amount
  );

  return {
    id: '', // will be assigned by sync layer
    platform: 'shopify' as Platform,
    platformId: product.id,
    title: product.title,
    sku,
    description: null,
    price,
    currency: product.priceRangeV2.minVariantPrice.currencyCode,
    inventory: product.totalInventory,
    status: product.status === 'ACTIVE' ? 'active' : 'inactive',
    imageUrl: product.featuredImage?.url || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rawData: product as unknown as Record<string, unknown>,
  };
}

export function shopifyOrderToCanonical(order: ShopifyOrder, shop: string): {
  order: CanonicalOrder;
  customer: CanonicalCustomer | null;
  lineItems: CanonicalLineItem[];
} {
  const subtotal = parseMoneyAsInteger(
    order.currentSubtotalPriceSet.shopMoney.amount
  );
  const tax = parseMoneyAsInteger(
    order.currentTotalTaxSet?.shopMoney.amount || '0'
  );
  const shipping = parseMoneyAsInteger(
    order.totalShippingPriceSet.shopMoney.amount
  );
  const discount = parseMoneyAsInteger(
    order.currentTotalDiscountsSet.shopMoney.amount
  );
  const total = parseMoneyAsInteger(
    order.currentTotalPriceSet.shopMoney.amount
  );

  const customer = order.customer
    ? {
        id: '', // will be assigned by sync layer
        platform: 'shopify' as Platform,
        platformId: order.customer.id,
        email: order.customer.email || '',
        firstName: order.customer.firstName,
        lastName: order.customer.lastName,
        createdAt: new Date(),
        updatedAt: new Date(),
        rawData: order.customer as unknown as Record<string, unknown>,
      }
    : null;

  const lineItems: CanonicalLineItem[] = order.lineItems.edges.map(
    ({ node }, idx) => ({
      id: '', // will be assigned by sync layer
      orderId: '', // will be assigned by sync layer
      productId: null, // will be resolved by product SKU match in sync layer
      platform: 'shopify' as Platform,
      sku: node.sku,
      title: node.title,
      quantity: node.quantity,
      unitPrice: parseMoneyAsInteger(
        node.originalUnitPriceSet.shopMoney.amount
      ),
      total: parseMoneyAsInteger(node.discountedTotalSet.shopMoney.amount),
      rawData: node as unknown as Record<string, unknown>,
    })
  );

  const createdAt = new Date(order.createdAt);

  return {
    order: {
      id: '', // will be assigned by sync layer
      platform: 'shopify' as Platform,
      platformId: order.id,
      customerId: customer?.id || null,
      customerEmail: order.email || customer?.email || null,
      financialStatus: getFinancialStatusForPlatform(
        'shopify',
        order.displayFinancialStatus || ''
      ),
      fulfillmentStatus: getFulfillmentStatusForPlatform(
        'shopify',
        order.displayFulfillmentStatus || ''
      ),
      subtotal,
      tax,
      shipping,
      discount,
      total,
      currency: order.currentTotalPriceSet.shopMoney.currencyCode,
      createdAt,
      updatedAt: new Date(),
      rawData: order as unknown as Record<string, unknown>,
    },
    customer,
    lineItems,
  };
}

// =============================================================================
// AMAZON ADAPTERS
// =============================================================================

export interface AmazonProduct {
  ASIN: string;
  SellerSKU: string;
  Title: string;
  Brand?: string;
  Status: 'Active' | 'Inactive' | 'Incomplete';
  Price: { Amount: string; CurrencyCode: string };
  FulfillmentAvailability?: { Quantity: number };
  ImageUrl?: string;
}

export interface AmazonOrderItem {
  ASIN: string;
  SellerSKU: string;
  Title: string;
  QuantityOrdered: number;
  ItemPrice: { CurrencyCode: string; Amount: string };
  ItemTax?: { CurrencyCode: string; Amount: string };
}

export interface AmazonOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  OrderStatus:
    | 'Pending'
    | 'Unshipped'
    | 'PartiallyShipped'
    | 'Shipped'
    | 'Canceled'
    | 'Unfulfillable';
  OrderTotal: { CurrencyCode: string; Amount: string };
  BuyerInfo?: { BuyerEmail?: string; BuyerName?: string };
  Items: AmazonOrderItem[];
}

export function amazonProductToCanonical(
  product: AmazonProduct
): CanonicalProduct {
  return {
    id: '',
    platform: 'amazon' as Platform,
    platformId: product.ASIN,
    title: product.Title,
    sku: product.SellerSKU,
    description: null,
    price: parseMoneyAsInteger(product.Price.Amount),
    currency: product.Price.CurrencyCode,
    inventory: product.FulfillmentAvailability?.Quantity || null,
    status: product.Status === 'Active' ? 'active' : 'inactive',
    imageUrl: product.ImageUrl || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rawData: product as unknown as Record<string, unknown>,
  };
}

export function amazonOrderToCanonical(order: AmazonOrder): {
  order: CanonicalOrder;
  customer: CanonicalCustomer | null;
  lineItems: CanonicalLineItem[];
} {
  const total = parseMoneyAsInteger(order.OrderTotal.Amount);

  const customer = order.BuyerInfo
    ? {
        id: '',
        platform: 'amazon' as Platform,
        platformId: order.AmazonOrderId,
        email: order.BuyerInfo.BuyerEmail || '',
        firstName: order.BuyerInfo.BuyerName?.split(' ')[0] || null,
        lastName: order.BuyerInfo.BuyerName?.split(' ').slice(1).join(' ') || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        rawData: order.BuyerInfo as unknown as Record<string, unknown>,
      }
    : null;

  let subtotal = 0;
  let tax = 0;
  const lineItems = order.Items.map((item) => {
    const itemPrice = parseMoneyAsInteger(item.ItemPrice.Amount);
    const itemTax = parseMoneyAsInteger(item.ItemTax?.Amount || '0');
    const total = itemPrice + itemTax;
    subtotal += itemPrice;
    tax += itemTax;
    return {
      id: '',
      orderId: '',
      productId: null,
      platform: 'amazon' as Platform,
      sku: item.SellerSKU,
      title: item.Title,
      quantity: item.QuantityOrdered,
      unitPrice: Math.round(itemPrice / item.QuantityOrdered),
      total,
      rawData: item as unknown as Record<string, unknown>,
    } as CanonicalLineItem;
  });

  const createdAt = new Date(order.PurchaseDate);

  return {
    order: {
      id: '',
      platform: 'amazon' as Platform,
      platformId: order.AmazonOrderId,
      customerId: customer?.id || null,
      customerEmail: order.BuyerInfo?.BuyerEmail || null,
      financialStatus: getFinancialStatusForPlatform(
        'amazon',
        order.OrderStatus
      ),
      fulfillmentStatus: getFulfillmentStatusForPlatform(
        'amazon',
        order.OrderStatus
      ),
      subtotal,
      tax,
      shipping: 0, // Amazon doesn't break out shipping separately
      discount: 0,
      total,
      currency: order.OrderTotal.CurrencyCode,
      createdAt,
      updatedAt: new Date(),
      rawData: order as unknown as Record<string, unknown>,
    },
    customer,
    lineItems,
  };
}

// =============================================================================
// WOOCOMMERCE ADAPTERS
// =============================================================================

export interface WooProduct {
  id: number;
  name: string;
  slug: string;
  sku: string;
  price: string;
  regular_price: string;
  status: 'publish' | 'draft' | 'private';
  stock_quantity: number | null;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  images: Array<{ src: string }>;
  categories: Array<{ name: string }>;
}

export interface WooLineItem {
  id: number;
  name: string;
  product_id: number;
  sku: string;
  quantity: number;
  price: number;
  total: string;
  subtotal: string;
}

export interface WooOrder {
  id: number;
  number: string;
  status: 'pending' | 'processing' | 'on-hold' | 'completed' | 'cancelled' | 'refunded' | 'failed';
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
  line_items: WooLineItem[];
}

export function wooProductToCanonical(
  product: WooProduct
): CanonicalProduct {
  return {
    id: '',
    platform: 'woocommerce' as Platform,
    platformId: product.id.toString(),
    title: product.name,
    sku: product.sku || null,
    description: null,
    price: parseMoneyAsInteger(product.price),
    currency: 'USD',
    inventory: product.stock_quantity,
    status: product.status === 'publish' ? 'active' : 'inactive',
    imageUrl: product.images?.[0]?.src || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rawData: product as unknown as Record<string, unknown>,
  };
}

export function wooOrderToCanonical(order: WooOrder): {
  order: CanonicalOrder;
  customer: CanonicalCustomer | null;
  lineItems: CanonicalLineItem[];
} {
  const subtotal = parseMoneyAsInteger(order.subtotal);
  const tax = parseMoneyAsInteger(order.total_tax);
  const shipping = parseMoneyAsInteger(order.shipping_total);
  const discount = parseMoneyAsInteger(order.discount_total);
  const total = parseMoneyAsInteger(order.total);

  const customer = {
    id: '',
    platform: 'woocommerce' as Platform,
    platformId: order.customer_id.toString(),
    email: order.billing.email,
    firstName: order.billing.first_name || null,
    lastName: order.billing.last_name || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rawData: order.billing as unknown as Record<string, unknown>,
  };

  const lineItems = order.line_items.map((item) => ({
    id: '',
    orderId: '',
    productId: null,
    platform: 'woocommerce' as Platform,
    sku: item.sku || null,
    title: item.name,
    quantity: item.quantity,
    unitPrice: Math.round(parseMoneyAsInteger(item.price.toString())),
    total: parseMoneyAsInteger(item.total),
    rawData: item as unknown as Record<string, unknown>,
  })) as CanonicalLineItem[];

  const createdAt = new Date(order.date_created);

  return {
    order: {
      id: '',
      platform: 'woocommerce' as Platform,
      platformId: order.number,
      customerId: customer.id,
      customerEmail: customer.email,
      financialStatus: getFinancialStatusForPlatform(
        'woocommerce',
        order.status
      ),
      fulfillmentStatus: getFulfillmentStatusForPlatform(
        'woocommerce',
        order.status
      ),
      subtotal,
      tax,
      shipping,
      discount,
      total,
      currency: order.currency,
      createdAt,
      updatedAt: new Date(),
      rawData: order as unknown as Record<string, unknown>,
    },
    customer,
    lineItems,
  };
}

// =============================================================================
// ETSY ADAPTERS
// =============================================================================

export interface EtsyMoney {
  amount: number;
  divisor: number;
  currency_code: string;
}

export interface EtsyListing {
  listing_id: number;
  title: string;
  state: 'active' | 'inactive' | 'sold_out' | 'expired' | 'draft';
  quantity: number;
  price: EtsyMoney;
  sku: string[];
  url: string;
  shop_section_id: number | null;
  images: Array<{ url_570xN: string }>;
}

export interface EtsyTransaction {
  transaction_id: number;
  title: string;
  sku: string;
  quantity: number;
  price: EtsyMoney;
  listing_id: number;
}

export interface EtsyReceipt {
  receipt_id: number;
  status: 'open' | 'unshipped' | 'shipped' | 'paid' | 'completed' | 'fully_refunded' | 'partially_refunded';
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
  transactions: EtsyTransaction[];
}

function etsyMoneyToInteger(money: EtsyMoney): number {
  return Math.round((money.amount / money.divisor) * 100);
}

export function etsyListingToCanonical(
  listing: EtsyListing
): CanonicalProduct {
  return {
    id: '',
    platform: 'etsy' as Platform,
    platformId: listing.listing_id.toString(),
    title: listing.title,
    sku: listing.sku?.[0] || null,
    description: null,
    price: etsyMoneyToInteger(listing.price),
    currency: listing.price.currency_code,
    inventory: listing.quantity,
    status: listing.state === 'active' ? 'active' : 'inactive',
    imageUrl: listing.images?.[0]?.url_570xN || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rawData: listing as unknown as Record<string, unknown>,
  };
}

export function etsyReceiptToCanonical(receipt: EtsyReceipt): {
  order: CanonicalOrder;
  customer: CanonicalCustomer | null;
  lineItems: CanonicalLineItem[];
} {
  const subtotal = etsyMoneyToInteger(receipt.subtotal);
  const tax = etsyMoneyToInteger(receipt.total_tax_cost);
  const shipping = etsyMoneyToInteger(receipt.total_shipping_cost);
  const discount = etsyMoneyToInteger(receipt.discount_amt);
  const total = etsyMoneyToInteger(receipt.grandtotal);

  const customer = {
    id: '',
    platform: 'etsy' as Platform,
    platformId: receipt.receipt_id.toString(),
    email: receipt.buyer_email,
    firstName: receipt.name.split(' ')[0] || null,
    lastName: receipt.name.split(' ').slice(1).join(' ') || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    rawData: {
      buyer_email: receipt.buyer_email,
      name: receipt.name,
    } as Record<string, unknown>,
  };

  const lineItems = receipt.transactions.map((txn) => ({
    id: '',
    orderId: '',
    productId: null,
    platform: 'etsy' as Platform,
    sku: txn.sku || null,
    title: txn.title,
    quantity: txn.quantity,
    unitPrice: Math.round(
      (etsyMoneyToInteger(txn.price) / txn.quantity)
    ),
    total: etsyMoneyToInteger(txn.price),
    rawData: txn as unknown as Record<string, unknown>,
  })) as CanonicalLineItem[];

  const createdAt = new Date(receipt.created_timestamp * 1000);

  return {
    order: {
      id: '',
      platform: 'etsy' as Platform,
      platformId: receipt.receipt_id.toString(),
      customerId: customer.id,
      customerEmail: customer.email,
      financialStatus: getFinancialStatusForPlatform('etsy', receipt.status),
      fulfillmentStatus: getFulfillmentStatusForPlatform(
        'etsy',
        receipt.status
      ),
      subtotal,
      tax,
      shipping,
      discount,
      total,
      currency: receipt.subtotal.currency_code,
      createdAt,
      updatedAt: new Date(),
      rawData: receipt as unknown as Record<string, unknown>,
    },
    customer,
    lineItems,
  };
}
