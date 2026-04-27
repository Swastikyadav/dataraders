import type { Connector } from "./types";
import type { Platform } from "@/lib/types/canonical";
import { shopifyConnector } from "./shopify";
import { amazonConnector } from "./amazon";
import { wooCommerceConnector } from "./woocommerce";
import { etsyConnector } from "./etsy";

// =============================================================================
// CONNECTOR REGISTRY
// =============================================================================
// The single point where all connectors are listed. Adding a new platform =
// add a connector file + one line in this map. Nothing else in the app needs
// to know about specific connectors.

export const connectors: Partial<Record<Platform, Connector>> = {
  shopify: shopifyConnector,
  amazon: amazonConnector,
  woocommerce: wooCommerceConnector,
  etsy: etsyConnector,
};

export function getConnector(platform: Platform): Connector {
  const c = connectors[platform];
  if (!c) {
    throw new Error(`No connector registered for platform: ${platform}`);
  }
  return c;
}

export function getAllConnectors(): Connector[] {
  return Object.values(connectors).filter(
    (c): c is Connector => c !== undefined,
  );
}
