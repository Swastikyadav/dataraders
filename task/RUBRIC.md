## 1. Context

**Problem / Task Name:** Build a canonical e-commerce schema with platform connectors

**Problem Statement Reference:** `./PROBLEM_STATEMENT.md`

---

## 2. Scoring Scale

Every criterion uses the same 1–10 scale:

- **1–2 — Very Poor.** Misses the point of the requirement, or makes the codebase worse.
- **3–4 — Weak.** Partial attempt with major gaps. Below acceptable engineering quality.
- **5–6 — Adequate.** Reasonable shape, with real issues or omissions.
- **7–8 — Good.** Solid work. Minor issues only. Maintainable.
- **9–10 — Excellent.** Robust, idiomatic, well-aligned. Little to critique.

---

## 3. Criteria Overview

1. **Schema correctness** — does the canonical schema enforce the right invariants?
2. **Connector boundary** — is platform weirdness contained inside connectors?
3. **Sync idempotency & failure isolation** — can sync run repeatedly and partially fail safely?
4. **Type safety & DRYness** — do the types catch mistakes, and is logic centralized?
5. **Verifiability** — can you tell whether the layer actually works?

---

## 4. Criteria

### Criterion 1 — Schema correctness

**What this evaluates.** Whether the canonical schema gets the basics right: how money is stored, how statuses are constrained, how identity works across platforms (both internal and cross-platform via SKU), whether the original payload is kept, and whether timestamps are normalized.

**Why it matters.** The schema is the foundation. Every dashboard query and every chart sits on top of it. Mistakes here propagate everywhere: float money causes silent revenue drift, unconstrained status strings break filters, missing uniqueness causes duplicates on every re-sync, missing rawData makes every new field requirement a full re-sync, and missing or inconsistent SKU handling makes the dashboard's most valuable query — _"how is this product doing across all my channels combined?"_ — impossible to answer.

**Scoring guidance.**

- **9–10.** Money is integer minor units everywhere — types, schema, and connector outputs. Status fields are constrained at the type level to small canonical vocabularies. Composite `(platform, platformId)` uniqueness is on every entity that has a platform identifier. RawData is preserved on every entity. Timestamps are UTC `Date` instances, with explicit conversion from each platform's format. SKU is captured on both products and order line items, surfaced from the merchant-controlled SKU field on each platform (Shopify variant SKU, Amazon SellerSKU, WooCommerce sku, Etsy listing sku), denormalized onto line items so historical analytics survive product deletion or rename, and the schema does not require it to be non-null. Line items carry both an optional product reference and denormalized fields. Non-obvious choices are documented.
- **7–8.** Same as above with one or two minor omissions — e.g., rawData missing on customers, timestamps consistent but the convention isn't documented, or SKU is captured on products but not denormalized onto line items.
- **5–6.** Money is integer cents in the database, but the type system doesn't prevent floats from sneaking in. Status fields are strings without canonical constraints. Composite uniqueness is partial. SKU is on products but missing from line items, so historical product analytics break when a product is deleted.
- **3–4.** Money as floats. Status as free-form strings emitted directly from each platform. No composite uniqueness — re-sync produces duplicates. No rawData. SKU is missing entirely or only stored as a platform-internal ID, making cross-platform product matching impossible.
- **1–2.** None of the invariants enforced. Cross-platform queries are impossible without per-platform branching at query time.

---

### Criterion 2 — Connector boundary

**What this evaluates.** Whether platform-specific concerns (auth, money formats, status enums, customer extraction, currency conventions, timezone handling) stay inside the connector that owns them — and whether everything outside the connector layer treats platforms uniformly.

**Why it matters.** The connector layer is where the heterogeneity of the real world lives. If it leaks, every consumer (sync orchestrator, dashboard, future analytics) carries `if (platform === 'shopify')` branches that multiply with each new platform. A clean boundary is what makes "drop in a new platform" a one-file change instead of a multi-week project. It's also what lets dummy connectors and real connectors stand in for each other in tests and demos.

**Scoring guidance.**

- **9–10.** Every connector implements the same interface, enforced by types. No platform-shaped values escape a connector. Status mapping, money conversion, and customer extraction live inside the connector that needs them. Real and dummy connectors are interchangeable from the consumer's perspective. The registry is the single point that lists connectors. Adding a new platform demonstrably requires only a new connector file plus a registry entry.
- **7–8.** Boundary is solid. One or two consumers reference platform names for cosmetic reasons (e.g., display labels), but no business logic branches on platform.
- **5–6.** Some mapping happens outside connectors (e.g., status normalization in the sync orchestrator). Adding a new platform means touching one or two non-connector files.
- **3–4.** Connectors return different shapes; consumers handle the differences. Platform branching appears in the orchestrator or the dashboard. Adding a new platform requires schema changes.
- **1–2.** Connectors are passthroughs returning raw platform payloads. The canonical layer doesn't normalize.

---

### Criterion 3 — Sync idempotency & failure isolation

**What this evaluates.** Whether sync can be safely re-run, whether stale data gets cleaned up on updates, whether one connector's failure spares the others, and whether sync state is observable.

**Why it matters.** Sync runs repeatedly — on schedules, on retries, on demand. A non-idempotent sync silently doubles revenue every time someone clicks Refresh. A sync that doesn't replace line items leaves stale data when an order is edited. A sync that rolls back all platforms when one fails means a single Shopify outage wipes three other platforms' fresh data. These bugs don't show up immediately; they show up as "the dashboard says $12K but my Shopify says $11K and I don't know why," which kills trust in the product.

**Scoring guidance.**

- **9–10.** Upserts use `(platform, platformId)` keys; re-running produces identical state. Order updates replace line items in a transaction so no partial state is possible. Write order respects FK dependencies (products → customers → orders → items). Each connector's sync is independent — one failure doesn't affect others. SyncState is recorded per platform on both success and failure, with timestamp, status, counts, and error message. The sync function returns a structured result.
- **7–8.** Idempotency holds. Connectors are isolated. SyncState is recorded. Minor gaps — e.g., line item replacement isn't transactional, or partial-success isn't surfaced.
- **5–6.** Idempotent on unchanged data, but re-syncing after an order edit leaves stale items. Connectors share a transaction — one failure rolls back others. SyncState only on success.
- **3–4.** Re-syncing produces duplicates. Line items accumulate instead of being replaced. One connector's failure aborts the whole sync. No sync state recorded.
- **1–2.** Sync isn't safe to run repeatedly. Failures leave the database inconsistent. No isolation, no observability.

---

### Criterion 4 — Type safety & DRYness

**What this evaluates.** Whether the type system catches misuse, and whether logic that should live in one place actually does.

**Why it matters.** This layer gets edited often — every new platform adds a connector, every schema evolution touches the canonical types. Without strong types, mapping bugs aren't caught: one connector starts treating refunds as `cancelled` while another treats them as `refunded`, and revenue numbers slowly drift apart. Without DRY factoring, new platforms get added by copy-pasting an existing connector and forgetting to update half the mappings. These inconsistencies are individually small but collectively corrosive.

**Scoring guidance.**

- **9–10.** Canonical types use precise unions for statuses. Money fields have a clear "integer cents" convention, ideally with a single helper that's the only blessed way to produce them. The connector interface is strictly typed — a connector that returns the wrong shape fails to compile. Per-platform status mapping is one helper per platform, not duplicated. Money conversion goes through one shared helper. Upsert logic is factored where structure permits. No `any` in paths handling real data; assertions are absent or localized.
- **7–8.** Strong types and good factoring. One or two repeated patterns across connectors that could be extracted but aren't. Occasional small assertions, none in critical logic.
- **5–6.** Status mapping duplicated between two connectors, or split between connectors and the orchestrator. Money conversion implemented inline in some connectors instead of through a helper. A few `any` types in non-critical paths.
- **3–4.** Statuses typed as `string` — no compile-time check on canonical values. Money conversion duplicated with subtle differences (one rounds, one truncates). `any` in connector outputs.
- **1–2.** Types are absent or all `any`. Mapping logic scattered with no consistency. Bug fixes have to be ported manually across the codebase.

---

### Criterion 5 — Verifiability

**What this evaluates.** Whether the implementation ships with a way to confirm the canonical layer is doing its job — both through realistic dummy data that exercises edge cases, and through inspection or test queries that prove cross-platform unification works.

**Why it matters.** The canonical layer is invisible. There's no UI on top of it yet, so a buggy canonical layer can look fine until the dashboard is built and the numbers come out wrong. Three things make it visible: (a) dummy data diverse enough to actually exercise the schema — varied dates, statuses, customers, **and SKUs that intentionally overlap across platforms** so cross-platform product matching has something to match; (b) a domain narrative that's plausibly the same merchant selling the same catalog across multiple channels (not a candle shop on WooCommerce and a USB cable seller on Amazon, which makes the cross-platform story incoherent); and (c) inspection scripts or tests that run unified queries and confirm they produce sensible results. Without these, "it compiles and the connectors return something" is the only evidence anyone has that the layer works.

**Scoring guidance.**

- **9–10.** Dummy connectors share a coherent product domain (the same merchant believably sells across all platforms), with intentional SKU overlap — at least a few SKUs appear on 2+ platforms so cross-platform queries return meaningful results. Orders are spread across many days with weekday/weekend rhythm, customers include recurring/one-time/guest, full status distributions including refunds and cancellations, edge cases like out-of-stock products and missing customer info. An inspection script (or test suite) runs unified analytics queries — total revenue, daily breakdown by platform, **top SKUs unified across platforms (grouped by SKU, not by per-platform product ID)**, top customers by lifetime spend, status distributions — and prints results that prove the canonical layer collapses the platform differences correctly. Schema invariants (integer cents, valid statuses, valid dates) are explicitly checked.
- **7–8.** Dummy data is varied with some SKU overlap; inspection script runs the main unified queries including a SKU-unified one. Some edge cases missing (e.g., no guest checkouts, no refunds), or invariants checked implicitly via query results rather than explicitly.
- **5–6.** Dummy data exists but is thin (10 orders all from today, one customer per platform, no SKU overlap). Inspection script exists but only confirms data was loaded, not that cross-platform queries work.
- **3–4.** Dummy data is minimal — a few hardcoded orders that don't exercise date ranges, status variety, or customer overlap, and SKUs are entirely disjoint across platforms (so cross-platform product matching has nothing to demonstrate). No inspection or verification beyond "it didn't crash."
- **1–2.** No dummy data, or data so trivial that nothing meaningful can be queried. No way to confirm the layer works without building the dashboard on top.

---

## 5. Rubric Summary

- **Number of criteria:** 5
- **Maximum rubric score:** 5 × 10 = 50
- **Intended use:** alongside functional tests (idempotency tests, cross-platform aggregation tests, schema constraint tests, type-level tests on connector return shapes).
