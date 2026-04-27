"use server";

import type {
  CanonicalProduct,
  CanonicalOrder,
  CanonicalOrderItem,
  FinancialStatus,
  FulfillmentStatus,
  ProductStatus,
} from "@/lib/types/canonical";
import type { Connector } from "./types";
import { toCents } from "./types";

// =============================================================================
// SHOPIFY CONNECTOR
// =============================================================================
// Talks to the live Shopify Admin GraphQL API using OAuth client credentials.
// Internally handles auth, money conversion, and status normalization.
// Returns canonical types, no Shopify-specific shapes leak past this file.

const SHOP = process.env.SHOPIFY_SHOP;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const API_VERSION = process.env.SHOPIFY_API_VERSION;

// -----------------------------------------------------------------------------
// Auth: cache the access token in memory.
// Tokens are valid 24h a single sync run is seconds. For a serverless setup
// where the process dies between requests, this becomes a no-op cache and
// each sync grabs a fresh token — that's fine, the call is cheap.
// -----------------------------------------------------------------------------

let cachedToken: string | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  if (!SHOP || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Missing shopify env vars.s");
  }

  const url = `https://${SHOP}.myshopify.com/admin/oauth/access_token`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Shopify token request failed (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { access_token: string };
  cachedToken = data.access_token;
  return cachedToken;
}

// -----------------------------------------------------------------------------
// GraphQL helper — generic over the response shape.
// -----------------------------------------------------------------------------

async function graphql<T>(query: string): Promise<T> {
  const token = await getAccessToken();
  const url = `https://${SHOP}.myshopify.com/admin/api/${API_VERSION}/graphql.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    throw new Error(
      `Shopify GraphQL failed (${res.status}): ${await res.text()}`,
    );
  }

  const data = (await res.json()) as { data: T; errors: unknown[] };
  if (data.errors) {
    throw new Error(
      `Shopify GraphQL errors: ${JSON.stringify(data.errors, null, 2)}`,
    );
  }

  return data.data;
}

// -----------------------------------------------------------------------------
// Status normalization — Shopify's vocabulary → canonical.
// Each platform has its own enum values; we collapse them to canonical here
// so the dashboard never sees Shopify-specific strings.
// -----------------------------------------------------------------------------
function mapFinancialStatus(s: string | null | undefined): FinancialStatus {
  switch (s?.toLowerCase()) {
    case "paid":
    case "partially_paid":
      return "paid";
    case "refunded":
    case "partially_refunded":
      return "refunded";
    case "voided":
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function mapFulfillmentStatus(s: string | null | undefined): FulfillmentStatus {
  switch (s?.toLowerCase()) {
    case "fulfilled":
      return "fulfilled";
    case "partial":
    case "partially_fulfilled":
      return "partial";
    default:
      return "unfulfilled";
  }
}

function mapProductStatus(s: string | null | undefined): ProductStatus {
  switch (s?.toLowerCase()) {
    case "active":
      return "active";
    case "draft":
      return "draft";
    case "archived":
      return "archived";
    default:
      return "active";
  }
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

async function fetchProducts(): Promise<CanonicalProduct[]> {
  type Resp = {
    products: {
      edges: Array<{
        node: {
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
        };
      }>;
    };
  };

  const data = await graphql<Resp>(`
    {
      products(first: 100) {
        edges {
          node {
            id
            title
            vendor
            status
            totalInventory
            featuredImage {
              url
            }
            variants(first: 1) {
              edges {
                node {
                  sku
                }
              }
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  `);

  return data.products.edges.map(({ node }) => ({
    platform: "shopify" as const,
    platformProductId: node.id, // gid://shopify/Product/12345
    title: node.title,
    vendor: node.vendor ?? undefined,
    sku: node.variants.edges[0]?.node.sku ?? undefined,
    priceAmount: toCents(node.priceRangeV2.minVariantPrice.amount),
    priceCurrency: node.priceRangeV2.minVariantPrice.currencyCode,
    inventoryQty: node.totalInventory ?? 0,
    status: mapProductStatus(node.status),
    imageUrl: node.featuredImage?.url,
    rawData: node,
  }));
}

async function fetchOrders(): Promise<CanonicalOrder[]> {
  type Resp = {
    orders: {
      edges: Array<{
        node: {
          id: string;
          name: string;
          createdAt: string;
          displayFinancialStatus: string | null;
          displayFulfillmentStatus: string | null;
          currentTotalPriceSet: {
            shopMoney: { amount: string; currencyCode: string };
          };
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
          lineItems: {
            edges: Array<{
              node: {
                title: string;
                sku: string | null;
                quantity: number;
                originalUnitPriceSet: { shopMoney: { amount: string } };
                discountedTotalSet: { shopMoney: { amount: string } };
              };
            }>;
          };
        };
      }>;
    };
  };

  const data = await graphql<Resp>(`
    {
      orders(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            currentTotalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            currentSubtotalPriceSet {
              shopMoney {
                amount
              }
            }
            currentTotalTaxSet {
              shopMoney {
                amount
              }
            }
            totalShippingPriceSet {
              shopMoney {
                amount
              }
            }
            currentTotalDiscountsSet {
              shopMoney {
                amount
              }
            }
            customer {
              id
              email
              firstName
              lastName
            }
            email
            lineItems(first: 50) {
              edges {
                node {
                  title
                  sku
                  quantity
                  originalUnitPriceSet {
                    shopMoney {
                      amount
                    }
                  }
                  discountedTotalSet {
                    shopMoney {
                      amount
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  return data.orders.edges.map(({ node }) => {
    const items: CanonicalOrderItem[] = node.lineItems.edges.map(
      ({ node: li }) => ({
        title: li.title,
        sku: li.sku ?? undefined,
        quantity: li.quantity,
        unitPrice: toCents(li.originalUnitPriceSet.shopMoney.amount),
        totalPrice: toCents(li.discountedTotalSet.shopMoney.amount),
        rawData: li,
      }),
    );

    const customer = node.customer
      ? {
          platform: "shopify" as const,
          platformCustomerId: node.customer.id,
          email: node.customer.email ?? undefined,
          firstName: node.customer.firstName ?? undefined,
          lastName: node.customer.lastName ?? undefined,
        }
      : undefined;

    return {
      platform: "shopify" as const,
      platformOrderId: node.id,
      orderNumber: node.name,
      totalAmount: toCents(node.currentTotalPriceSet.shopMoney.amount),
      subtotalAmount: toCents(node.currentSubtotalPriceSet.shopMoney.amount),
      taxAmount: node.currentTotalTaxSet
        ? toCents(node.currentTotalTaxSet.shopMoney.amount)
        : undefined,
      shippingAmount: toCents(node.totalShippingPriceSet.shopMoney.amount),
      discountAmount: toCents(node.currentTotalDiscountsSet.shopMoney.amount),
      currency: node.currentTotalPriceSet.shopMoney.currencyCode,
      financialStatus: mapFinancialStatus(node.displayFinancialStatus),
      fulfillmentStatus: mapFulfillmentStatus(node.displayFulfillmentStatus),
      customer,
      customerEmail: node.customer?.email ?? node.email ?? undefined,
      placedAt: new Date(node.createdAt),
      items,
      rawData: node,
    };
  });
}

export const shopifyConnector: Connector = {
  platform: "shopify",
  fetchProducts,
  fetchOrders,
};
