import type {
  CanonicalProduct,
  CanonicalOrder,
  Platform,
} from "@/lib/types/canonical";

// =============================================================================
// CONNECTOR INTERFACE
// =============================================================================
// Every connector implements this. The sync orchestrator and the dashboard
// import the registry and use connectors abstractly — neither depends on a
// specific connector's implementation.

export interface Connector {
  platform: Platform;
  fetchProducts(): Promise<CanonicalProduct[]>;
  fetchOrders(): Promise<CanonicalOrder[]>;
}

// =============================================================================
// MONEY CONVERSION
// =============================================================================
// The single blessed way to convert platform-reported amounts into canonical
// cents. Every connector uses this — never inline arithmetic. This guarantees
// rounding behavior is consistent across the codebase.
//
// Examples:
//   toCents("949.95")  → 94995
//   toCents(12.99)     → 1299
//   toCents("0")       → 0

export function toCents(amount: string | number): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) {
    throw new Error(`toCents: invalid amount ${JSON.stringify(amount)}`);
  }
  return Math.round(num * 100);
}
