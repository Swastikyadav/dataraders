# Task: Build a canonical e-commerce schema with platform connectors

## Problem and justification

Today, an e-commerce business owner who sells across multiple platforms (Shopify, Amazon, WooCommerce, Etsy, etc.) has **no unified view of their business**. Each platform offers its own admin dashboard, with its own metrics, its own vocabulary, and its own data shape. To answer a question as basic as _"what was my total revenue last month across all my stores?"_, the owner must log into each platform separately, export reports manually, and reconcile the numbers in a spreadsheet.

A unified analytics dashboard requires, as its foundation, a **canonical data layer** — one schema that any platform's data can be mapped into, and one set of connectors that translate platform-specific responses into that schema.

This leads to several pain points that the canonical layer must solve:

1. **Every platform has a different data shape**
   - Shopify uses GraphQL, money as `{ amount: "949.95", currencyCode: "USD" }` strings, and uppercase status enums (`PAID`, `REFUNDED`).
   - Amazon's SP-API uses REST, money as `{ Amount, CurrencyCode }` strings, and a single `OrderStatus` enum (`Shipped`, `Unshipped`, `Canceled`) that conflates payment and fulfillment.
   - WooCommerce uses snake_case REST with lifecycle states like `processing`, `on-hold`, `completed`.
   - Etsy uses `{ amount: 2499, divisor: 100 }` integer-and-divisor money, and yet another status vocabulary.
   - Without a canonical layer, every chart and query in the dashboard must understand all of these shapes.

2. **Money requires careful handling**
   - Mixing platforms means mixing money formats, currencies, and precision conventions.
   - Floating-point arithmetic introduces drift (`0.1 + 0.2 !== 0.3`); summing thousands of orders amplifies the error.
   - Different platforms report subtotal, tax, shipping, and discount with different rules; the canonical layer must capture them consistently so the dashboard can show breakdowns without re-summing line items.

3. **Identity does not align across platforms**
   - Shopify order `#1001` and Amazon order `#1001` are unrelated entities that happen to share a number.
   - The same person buying on two platforms uses two different `customerId` values; their email may be the only common identifier.
   - **The same product listed on multiple platforms has different platform IDs** — `gid://shopify/Product/12345` on Shopify, an ASIN on Amazon, a numeric `product_id` on WooCommerce. The merchant thinks of these as one product; the platforms don't. SKU is typically the only field a merchant controls and keeps consistent across channels.
   - The canonical layer must give every entity an internal identity that is platform-agnostic, while preserving the platform-specific identifiers for traceability — and must enable matching the same logical product across platforms via SKU, so analytics like _"how many units of SKU X did I sell across all my stores combined?"_ are answerable with a single query.

4. **Sync must be idempotent and resilient**
   - Connectors will be re-run on a schedule, on a button click, on retries after failures.
   - Running a sync twice must produce the same database state as running it once.
   - Partial failures (one platform errors out while others succeed) must not corrupt data already loaded for the working platforms.

5. **Mapped fields are never enough**
   - No matter how comprehensive the canonical schema is, the dashboard will eventually need a field that wasn't mapped (a tax breakdown, a discount code, a fulfillment tracking number).
   - Re-syncing every order to fetch one missed field is expensive and sometimes impossible (rate limits, deleted source data).
   - The canonical layer must preserve the original platform payload alongside the normalized fields.

We want a feature that:

- Defines **one schema** that any e-commerce platform's data can be mapped into.
- Provides a **uniform connector interface** — every connector returns the same canonical shape, regardless of source.
- Allows the dashboard layer to query **only the canonical schema**, never the platforms directly.

---

## Define success: How can we know when the problem is solved?

The problem is considered solved when:

1. **A single canonical schema describes products, customers, orders, and order line items**
   - Money fields are integers in minor units (cents), never floats.
   - Status fields take values from small, fixed vocabularies (e.g., a financial status of `paid | pending | refunded | cancelled`), regardless of how each platform names its statuses internally.
   - Every entity has both an internal canonical identifier and a `(platform, platformId)` reference back to its source.
   - Every entity preserves the original platform payload in a raw-data field, so unmapped information remains recoverable without re-syncing.

2. **Every connector follows the same shared shape**
   - Adding a new platform is a localized change: a new connector and a single registration. No edits are needed to the schema, the sync layer, the dashboard, or any consumer.
   - Each connector can return at minimum the canonical products and the canonical orders for its platform. Internally it handles auth, pagination, money conversion, status mapping, and customer extraction; none of that detail leaks to the consumer.
   - A connector backed by a real API and a connector backed by static fixture data are indistinguishable to the rest of the system.

3. **The sync layer is idempotent and isolates failures**
   - Running a sync twice produces the same database state as running it once. No duplicate rows, no drifting totals.
   - Re-running a sync after a connector's data changes (price update, status change, line item edit) results in the canonical record reflecting the new state, with no stale leftover data.
   - If one connector fails, the other connectors' results are still committed.
   - The system records, per platform, the timestamp and outcome of the last sync attempt — including whether it succeeded, what it synced, and any error message.

4. **Cross-platform analytics queries work without per-platform branching**
   - Total revenue, AOV, order count, top products, daily revenue trends, customer rankings, and status distributions can all be computed with a single query against the canonical layer.
   - Such queries never need to branch on which platform a record came from in order to be correct. The canonical layer has already normalized those differences away.
   - Splitting any of these metrics by platform (e.g., revenue per platform per day) is also a single query, made possible by the platform field on every record.

5. **The same product across platforms can be analyzed as one product**
   - When a merchant lists the same SKU on multiple channels, the canonical layer must allow combined queries: total units sold of `SKU-X`, total revenue of `SKU-X`, which platforms `SKU-X` is sold on, which platform sells it best.
   - SKU is the cross-platform key. Connectors must surface the merchant's SKU (Shopify variant SKU, Amazon SellerSKU, WooCommerce SKU, Etsy listing SKU) on every product and on every order line item — not the platform's internal product ID.
   - The canonical layer does not require SKUs to exist (some products genuinely have none, and some platforms allow blank SKUs) but treats SKU when present as the merchant's stable cross-platform identifier.
   - Order line items must denormalize the SKU as it was reported at the time of purchase, so historical analytics work even after a product is renamed, deleted, or has its SKU changed on the platform.

6. **Type safety holds end-to-end**
   - The connector return types are precise enough that a dashboard developer cannot accidentally read a non-existent field or mishandle a financial status value the canonical layer does not produce.
   - Inserting a malformed canonical record (wrong status string, float money) is caught by the type system or schema constraints, not at query time.

7. **The canonical layer drops into a UI layer unchanged**
   - The canonical layer is usable from a web app, a CLI, a background worker, or any other host without modification.
   - The host treats it as ordinary code; no framework-specific contracts are baked into the canonical layer.

---

## Invariants

The canonical layer must uphold the following invariants regardless of how it is implemented.

- **Identity**
  - Within a single platform, no entity (product, customer, order) appears more than once for the same source identifier — re-syncing produces no duplicates.
  - Across platforms, the same source identifier on different platforms refers to different entities, even if the identifier value happens to match.

- **Money**
  - All money values are non-negative integers in minor units (e.g. cents). Floating-point money is never introduced, anywhere in the system.
  - Refunds and cancellations are represented through status, not through negative amounts on the order.

- **Statuses**
  - Status fields take only the canonical values defined for each domain (financial, fulfillment, product). A platform-specific value never reaches the stored data or any query.

- **Timestamps**
  - All stored timestamps are in a single timezone convention (UTC), regardless of what timezone or format the source platform reports.

- **SKU**
  - SKU is preserved from the platform on both products and order line items, treated as the merchant's cross-platform product identifier.
  - SKU on an order line item reflects the SKU as reported at the time of purchase, so historical analytics survive product deletion or rename on the source platform.
  - SKU is optional. The system does not require it to be non-null and does not invent SKUs to fill gaps.

- **Sync**
  - Re-syncing the same source data leaves the stored state unchanged (idempotency).
  - When source data changes, the stored state reflects the new data with no stale leftover (no orphaned line items, no stale status).
  - When syncing multiple platforms, a failure on one does not affect the data already committed for the others.
  - After every sync attempt, per-platform sync state is observable: when it last ran, whether it succeeded, what it synced, and any error message.

- **Independence**
  - The canonical layer does not depend on any web framework, server runtime, or UI library. It is consumable as plain code from any host environment.

---

## Example outcomes

### What a merchant should be able to ask the system

Once the canonical layer is in place, these questions can all be answered in seconds, with one query each, regardless of how many platforms the merchant sells on:

- "What was my total revenue across all my stores last month?"
- "Which day of last week was my best, and which platform drove it?"
- "Which products are my bestsellers across all channels combined?"
- "How is _this specific product_ doing on each of my platforms? Which channel sells it best?"
- "Who are my top customers by lifetime spend? Which platforms do they buy on?"
- "Which orders are still unpaid or unfulfilled across all my stores?"
- "When was my data last refreshed for each platform, and did the last refresh succeed?"

None of these questions can be answered today by logging into any single platform's admin. That is the value the canonical layer delivers.

### What developers should experience

The canonical layer should feel like one tidy module that the rest of the app reads from, not a collection of platform-specific code paths to keep in sync. Specifically:

- A developer adding a new platform writes new code in one place. They do not modify the schema, the sync layer, the dashboard, or anywhere else outside the new platform's connector and a single registration point.
- A developer building a new dashboard view writes one query against the canonical layer. They do not write per-platform code, do not handle Shopify's GraphQL responses or Amazon's REST responses directly, and do not need to know which platforms are connected for the query to be correct.
- A developer triggering a sync — manually, on a schedule, on a button click — invokes one operation that handles all connected platforms. A failure on one platform leaves the others' data intact, and the developer can inspect what failed and when.
- A developer debugging an unexpected number can trace any record back to its original platform payload, because that payload is preserved alongside the normalized data.

If any of these experiences requires per-platform branching in code outside the connectors themselves, the canonical layer is leaking and the design is incomplete.

---

## Capabilities

The canonical layer must provide the following capabilities. These are described as observable behaviors, not as code interfaces — the implementation is free to choose names, shapes, and signatures.

### A canonical data model

A single, platform-agnostic representation of products, customers, orders, and order line items. Every entity in the model:

- Carries an internal identifier that is not derived from any platform.
- Carries a back-reference to its source platform and the platform's identifier for that entity.
- Preserves the original platform payload, so any field not yet normalized remains recoverable.
- Uses canonical vocabularies for statuses, integer minor units for money, and a single timezone convention for timestamps.

### A platform connector capability

For each supported platform, an isolated component that fetches data from that platform and translates it into the canonical model. Connectors:

- Handle their platform's authentication, pagination, money format, status vocabulary, and customer extraction internally; none of these concerns appear elsewhere in the system.
- Return canonical entities only — no platform-shaped data leaks past the connector boundary.
- Are listed in a single registration point, so adding a new platform is a localized change.
- Are interchangeable in form between connectors backed by real APIs and connectors backed by fixture data.

### A sync capability

An operation that takes a connector, pulls its data, and writes the canonical result to storage. The sync capability:

- Is idempotent. Running it twice produces the same stored state as running it once.
- Respects entity dependencies (products before orders that reference them; customers before orders that reference them).
- Replaces an order's line items wholesale when the order is re-synced, treating the platform's current report as the source of truth.
- Records per-platform sync state — timestamp, success/failure outcome, counts of what was synced, and any error message — on every run, including failed runs.
- Isolates failures: when run across multiple connectors, a failure in one does not affect the data already committed for the others.

### A unified query surface

The stored canonical data must be queryable in a way that lets a single query produce cross-platform results. The query surface must support, at minimum:

- Aggregations across all platforms (total revenue, AOV, order count, status distributions).
- Time-series breakdowns (daily, weekly) optionally split by platform.
- Cross-platform product analytics keyed by SKU (combined units sold, combined revenue per SKU, which platforms a SKU is sold on, single-product per-platform breakdown).
- Cross-platform customer analytics keyed by email (lifetime spend, order count, platforms used).

No query against the canonical layer should need to branch on platform-specific values to be correct.
