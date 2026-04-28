# Implementation Evaluation Report

**Commit evaluated:** `9316fd3`, _feat: implement canonical e-commerce schema with multi-platform connectors_
**Rubric:** [task/RUBRIC.md](task/RUBRIC.md)
**Problem statement:** [task/PROBLEM_STATEMENT.md](task/PROBLEM_STATEMENT.md)

---

## Final Score

| #         | Criterion                            | Score     |
| --------- | ------------------------------------ | --------- |
| 1         | Schema correctness                   | 7/10      |
| 2         | Connector boundary                   | 6/10      |
| 3         | Sync idempotency & failure isolation | 6/10      |
| 4         | Type safety & DRYness                | 6/10      |
| 5         | Verifiability                        | 7/10      |
| **Total** |                                      | **32/50** |

**Percentage: 64%, Adequate to Good. Solid shape, real issues.**

---

## Criterion 1, Schema correctness, 7/10

**What was done well**

- Money is integer cents end-to-end: [prisma/schema.prisma:21](prisma/schema.prisma#L21) (`Int`), [lib/schema.ts:8](lib/schema.ts#L8) (`type Money = number`), and every adapter goes through [`parseMoneyAsInteger`](lib/schema.ts#L202) or [`etsyMoneyToInteger`](lib/connectors/adapters.ts#L493).
- Status fields are constrained at the type level to small canonical vocabularies, [`FinancialStatus`](lib/schema.ts#L12), [`FulfillmentStatus`](lib/schema.ts#L14-L21), [`ProductStatus`](lib/schema.ts#L23), and per-platform vocabulary mappings live in central tables ([lib/schema.ts:26-107](lib/schema.ts#L26-L107)).
- Composite `(platform, platformId)` uniqueness is on every entity that needs it, [Product](prisma/schema.prisma#L32), [Customer](prisma/schema.prisma#L51), [Order](prisma/schema.prisma#L77).
- `rawData` is preserved on **every** entity including line items ([prisma/schema.prisma:96](prisma/schema.prisma#L96)).
- Timestamps are `Date` instances. Etsy epoch seconds are converted at the adapter ([lib/connectors/adapters.ts:559](lib/connectors/adapters.ts#L559)). ISO strings parsed via `new Date(...)`.
- SKU is captured on both products and line items, denormalized onto line items ([prisma/schema.prisma:91](prisma/schema.prisma#L91)), and the schema correctly allows it to be null ([lib/schema.ts:118](lib/schema.ts#L118), [lib/schema.ts:166](lib/schema.ts#L166)).
- Indexes on `sku`, `platform`, `createdAt`, `financialStatus` support analytics queries.

**Issues**

- **`Money` is a bare type alias** (`type Money = number`). The type system doesn't actually prevent floats from being assigned to a money field. A branded type (e.g. `type Money = number & { readonly __cents: unique symbol }`) would actually enforce the invariant the comment claims.
- **No documented timestamp convention.** `new Date(order.createdAt)` is fine for ISO strings, but there's no comment or helper signalling "all timestamps stored UTC." Etsy-style epoch handling is a one-off.
- Minor: `parseMoneyAsInteger(value: number)` does `Math.round(value)` and returns it as cents, meaning if a caller passes dollars as a number (e.g. `8.99`), the result is silently `9` cents, not `899`. The contract isn't guarded.

---

## Criterion 2, Connector boundary, 6/10

**What was done well**

- A common interface ([`ConnectorDefinition`](lib/connectors/registry.ts#L37-L47)) is shared by all connectors, with a single registry ([`CONNECTORS` map](lib/connectors/registry.ts#L135-L140)) as the registration point.
- Status mapping, money conversion, and customer extraction live inside connector adapters (or shared schema helpers), not in the orchestrator.
- Real (Shopify, live GraphQL) and dummy (Amazon, Woo, Etsy) connectors are interchangeable from `syncPlatform`'s perspective, [`lib/sync.ts:44-65`](lib/sync.ts#L44-L65) does not branch on platform.
- Queries in [lib/queries.ts](lib/queries.ts) never reference platform names for control flow, they treat `platform` as data, used only for grouping/filtering by user request.
- Adding a new platform is a localized change: write a new file in `lib/connectors/`, write adapter functions, append one entry to `CONNECTORS`. No schema or sync edits required.

**Issues**

- **The interface is not strictly typed.** [`ConnectorDefinition`](lib/connectors/registry.ts#L37-L47) declares `fetchProducts(): Promise<any[]>` and `toCanonicalProduct(raw: any)`. A connector that returns the wrong shape would compile cleanly. The rubric explicitly calls out: "a connector that returns the wrong shape fails to compile", this implementation doesn't satisfy that. Generics on the interface (`ConnectorDefinition<RawProduct, RawOrder>`) would have closed this gap.
- Status maps live in `lib/schema.ts` (the canonical layer) rather than inside each connector. Defensible, it centralizes the vocabulary, but it does mean a Shopify-specific status string visibly appears in the canonical layer's source, blurring the boundary slightly.

---

## Criterion 3, Sync idempotency & failure isolation, 6/10

**What was done well**

- Upserts use `(platform, platformId)` keys ([lib/sync.ts:88-94](lib/sync.ts#L88-L94), and similarly for customers and orders). Re-running the same sync produces the same row IDs.
- Line items are deleted and recreated wholesale per platform inside a transaction ([lib/sync.ts:211-253](lib/sync.ts#L211-L253)), handles edits correctly.
- **Per-platform failure isolation is real:** [`syncAllPlatforms`](lib/sync.ts#L302-L335) uses `Promise.allSettled` over independent `syncPlatform` calls, each with its own `db.$transaction`. One platform's failure cannot roll back another's commit.
- Sync state is logged on **both** success and failure paths via the post-`try/catch` `db.syncLog.create` ([lib/sync.ts:268-280](lib/sync.ts#L268-L280)).
- Write order respects FK dependencies: products → customers → orders → line items.
- A structured `SyncResult` is returned ([lib/sync.ts:17-27](lib/sync.ts#L17-L27)).

**Issues**

- **Customer FK linkage is broken.** In every adapter, the canonical `order.customerId` is set to `customer?.id || null`, and `customer.id` is the empty string `''` because canonical IDs aren't assigned until DB insert. In [lib/sync.ts:163-165](lib/sync.ts#L163-L165), the orchestrator does `customerMap.get(order.customerId)`, but `customerMap` is keyed by `customer.platformId`, not by `''`. The lookup always returns `undefined`, so `Order.customerId` is always written as `null`. The denormalized `customerEmail` field saves the queries from being broken in practice, but the FK relationship the schema models is never populated. This is a real defect.
- **Wholesale line-item deletion is too broad.** [lib/sync.ts:217-221](lib/sync.ts#L217-L221) deletes line items for _all_ orders of the platform, not just orders being synced. This works only because the current API path always re-syncs everything. a future "sync one order" path would silently wipe unrelated orders' line items. Replacing per `orderMap` keys would be safer.
- **Amazon/Etsy customer identity is wrong.** Both adapters use the _order ID_ as the customer's `platformId` ([lib/connectors/adapters.ts:247](lib/connectors/adapters.ts#L247) and [:532](lib/connectors/adapters.ts#L532)). Each order produces a fresh customer row even when the buyer is the same person. Idempotent on re-sync (same order → same customer row), but multiple orders by `a.chen@example.com` create N customer rows.
- `SyncLog` has `@@unique([platform, startedAt])`, a benign denormalization, but if two syncs of the same platform somehow shared a millisecond, the log write would throw inside the catch-the-log-error path.

---

## Criterion 4, Type safety & DRYness, 6/10

**What was done well**

- Statuses are precise unions, not raw strings.
- Money conversion goes through one helper ([`parseMoneyAsInteger`](lib/schema.ts#L202)). Etsy has its own [`etsyMoneyToInteger`](lib/connectors/adapters.ts#L493) but it's a single, scoped helper for the divisor format.
- Status mapping is one helper per platform ([`FINANCIAL_STATUS_MAP`](lib/schema.ts#L26)), not duplicated.
- Strict mode is on. canonical types use `string | null` rather than `string | undefined` ambiguity.

**Issues**

- **`any` in the connector interface itself** ([lib/connectors/registry.ts:39-46](lib/connectors/registry.ts#L39-L46)). This is the most type-safety-relevant surface in the project, and it's typed as `any[]` and `raw: any`. Generics would have eliminated this.
- **`Money` is `number`.** No branded type. floats can be assigned to money fields without a compile error. The "convention" lives in comments only.
- **`as any` on rawData writes** in [lib/sync.ts](lib/sync.ts), `rawData: product.rawData as any` appears at every upsert. A typed `Prisma.JsonValue` cast would have been cleaner.
- **`as unknown as Record<string, unknown>`** is used in every adapter to coerce rawData. Tolerable, but it's the same pattern repeated ~10 times, a small helper (`toRawJson(x)`) would have removed the noise.
- **`const where: any = {}`** appears throughout [lib/queries.ts](lib/queries.ts) (e.g. lines 21, 56, 112). Prisma generates `Prisma.OrderWhereInput` types, using them would have been a one-line change per query.
- **Adapter boilerplate**, each adapter sets `id: ''`, `createdAt: new Date()`, `updatedAt: new Date()` for entries that the sync layer overwrites or DB defaults handle. Indicates the canonical type and the DTO returned by adapters could profitably be split (e.g. `Omit<CanonicalProduct, 'id' | 'createdAt' | 'updatedAt'>`).

---

## Criterion 5, Verifiability, 7/10

**What was done well**

- **Coherent domain narrative.** Comments at the top of each connector establish "Hearth & Powder Co." as a single snowboard merchant selling across Shopify (live), Amazon (mainstream retail), Woo (regional/wholesale), Etsy (artisan/handcraft side). Believable as one merchant.
- **SKU overlap is intentional.** Amazon ([lib/connectors/amazon.ts](lib/connectors/amazon.ts)) and Woo carry shared SKUs (`SB-MINIMAL`, `SB-COMPLETE-1`, `SB-VIDEO`, `SB-COL-OXYGEN`, `SB-COMPARE`, `SB-SKIWAX`) plus channel-only products. Etsy is intentionally disjoint with an explicit comment justifying it as a different audience, defensible storytelling.
- **Dummy data is varied.** Amazon orders are spread across 60 days, include guest checkouts (`null` buyer), include cancelled/pending/unshipped statuses, randomized customers including recurring buyers.
- **Inspection script** ([test-sync.ts](test-sync.ts)) exercises the canonical layer end-to-end: total revenue, revenue by platform, **top products grouped by SKU across platforms** (the rubric's headline check), and a SKU lookup demonstrating the same SKU appears on multiple platforms with different prices.
- Commit message reports concrete output: "40 products, 115 orders, 58 customers synced … Total revenue: $113,925.07 computed in single query", evidence the inspection actually runs.

**Issues**

- **No explicit invariant checks.** The inspection script reports numbers, but doesn't assert "all `total` values are integers", "all financial statuses are in the canonical set", "no order has `total` < 0." These would catch a regression that quietly violated the schema's contracts.
- **No top-customers-by-spend output** in `test-sync.ts`, even though the query exists ([`getTopCustomersBySpend`](lib/queries.ts#L294)).
- **No status distribution output.** `getOrderCountByFinancialStatus` is implemented but not exercised in the inspection.
- **No test for re-sync idempotency.** The key invariant of the sync layer ("running twice = running once") isn't demonstrated by running sync twice and confirming row counts and IDs are stable.
- **Etsy SKU disjointness, while justified narratively, weakens the cross-platform demo.** A handful of Etsy listings sharing one SKU with Shopify (e.g. a "limited edition Minimal Snowboard" with `SB-MINIMAL`) would have made the cross-platform query span all four platforms instead of three.

---

## Summary

The score is held at 68% by three categories of issue:

1. **Type safety doesn't go all the way down.** `Money` is a documentation type, not an enforced one. the connector interface uses `any` for raw payloads. query helpers leak `where: any`. Several of the rubric's "compile-time check" claims are aspirational rather than enforced.

2. **A real correctness defect in customer linkage.** `Order.customerId` is never populated because the adapter passes `''` and the orchestrator looks it up in a map keyed by `platformId`. Hidden by the denormalized `customerEmail`, but the FK relationship the schema declares is non-functional.

3. **Verification stops at "it ran".** The inspection script prints results but doesn't assert invariants and doesn't demonstrate re-sync idempotency, the very property the sync layer is built around.
