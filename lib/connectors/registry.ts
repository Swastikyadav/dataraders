// =============================================================================
// CONNECTOR REGISTRY
// =============================================================================
// Central registration point for all platform connectors.
// Adding a new platform: create adapters, add to this file, done.

import { Platform, CanonicalProduct, CanonicalOrder, CanonicalCustomer, CanonicalLineItem } from '@/lib/schema';

import * as shopifyConnector from '@/lib/connectors/shopify';
import * as amazonConnector from '@/lib/connectors/amazon';
import * as wooConnector from '@/lib/connectors/woocommerce';
import * as etsyConnector from '@/lib/connectors/etsy';

import {
  shopifyProductToCanonical,
  shopifyOrderToCanonical,
  amazonProductToCanonical,
  amazonOrderToCanonical,
  wooProductToCanonical,
  wooOrderToCanonical,
  etsyListingToCanonical,
  etsyReceiptToCanonical,
  ShopifyProduct,
  ShopifyOrder,
  AmazonProduct,
  AmazonOrder,
  WooProduct,
  WooOrder,
  EtsyListing,
  EtsyReceipt,
} from '@/lib/connectors/adapters';

// =============================================================================
// CONNECTOR INTERFACE
// =============================================================================

export interface ConnectorDefinition {
  platform: Platform;
  fetchProducts(): Promise<any[]>;
  fetchOrders(): Promise<any[]>;
  toCanonicalProduct(raw: any): CanonicalProduct;
  toCanonicalOrder(raw: any): {
    order: CanonicalOrder;
    customer: CanonicalCustomer | null;
    lineItems: CanonicalLineItem[];
  };
}

// =============================================================================
// SHOPIFY CONNECTOR
// =============================================================================

const SHOPIFY_CONNECTOR: ConnectorDefinition = {
  platform: 'shopify',
  async fetchProducts() {
    const edges = await shopifyConnector.fetchProducts();
    return edges.map((e) => e.node);
  },
  async fetchOrders() {
    const edges = await shopifyConnector.fetchOrders();
    return edges.map((e) => e.node);
  },
  toCanonicalProduct(raw: ShopifyProduct) {
    return shopifyProductToCanonical(raw, process.env.SHOPIFY_SHOP || '');
  },
  toCanonicalOrder(raw: ShopifyOrder) {
    return shopifyOrderToCanonical(raw, process.env.SHOPIFY_SHOP || '');
  },
};

// =============================================================================
// AMAZON CONNECTOR
// =============================================================================

const AMAZON_CONNECTOR: ConnectorDefinition = {
  platform: 'amazon',
  async fetchProducts() {
    return amazonConnector.DUMMY_PRODUCTS;
  },
  async fetchOrders() {
    return amazonConnector.DUMMY_ORDERS;
  },
  toCanonicalProduct(raw: AmazonProduct) {
    return amazonProductToCanonical(raw);
  },
  toCanonicalOrder(raw: AmazonOrder) {
    return amazonOrderToCanonical(raw);
  },
};

// =============================================================================
// WOOCOMMERCE CONNECTOR
// =============================================================================

const WOOCOMMERCE_CONNECTOR: ConnectorDefinition = {
  platform: 'woocommerce',
  async fetchProducts() {
    return wooConnector.DUMMY_PRODUCTS;
  },
  async fetchOrders() {
    return wooConnector.DUMMY_ORDERS;
  },
  toCanonicalProduct(raw: WooProduct) {
    return wooProductToCanonical(raw);
  },
  toCanonicalOrder(raw: WooOrder) {
    return wooOrderToCanonical(raw);
  },
};

// =============================================================================
// ETSY CONNECTOR
// =============================================================================

const ETSY_CONNECTOR: ConnectorDefinition = {
  platform: 'etsy',
  async fetchProducts() {
    return etsyConnector.DUMMY_LISTINGS;
  },
  async fetchOrders() {
    return etsyConnector.DUMMY_RECEIPTS;
  },
  toCanonicalProduct(raw: EtsyListing) {
    return etsyListingToCanonical(raw);
  },
  toCanonicalOrder(raw: EtsyReceipt) {
    return etsyReceiptToCanonical(raw);
  },
};

// =============================================================================
// REGISTRY
// =============================================================================

const CONNECTORS: Map<Platform, ConnectorDefinition> = new Map([
  ['shopify', SHOPIFY_CONNECTOR],
  ['amazon', AMAZON_CONNECTOR],
  ['woocommerce', WOOCOMMERCE_CONNECTOR],
  ['etsy', ETSY_CONNECTOR],
]);

export function getConnector(platform: Platform): ConnectorDefinition {
  const connector = CONNECTORS.get(platform);
  if (!connector) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return connector;
}

export function getAllConnectors(): ConnectorDefinition[] {
  return Array.from(CONNECTORS.values());
}

export const SUPPORTED_PLATFORMS: Platform[] = Array.from(
  CONNECTORS.keys()
);
