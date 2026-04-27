import "dotenv/config";
import { db } from "@/lib/db";

const fmt = (cents: number) => "$" + (cents / 100).toFixed(2);

async function main() {
  console.log("=".repeat(75));
  console.log("UNIFIED E-COMMERCE ANALYTICS");
  console.log("=".repeat(75));

  // ---------------------------------------------------------------------------
  // Per-platform breakdown
  // ---------------------------------------------------------------------------
  console.log("\n📦 PLATFORM SUMMARY");
  const platforms = await db.order.groupBy({
    by: ["platform"],
    _count: true,
    _sum: { totalAmount: true },
    orderBy: { platform: "asc" },
  });
  for (const p of platforms) {
    const productCount = await db.product.count({
      where: { platform: p.platform },
    });
    console.log(
      `  ${p.platform.padEnd(14)} ${String(p._count).padStart(3)} orders | ` +
        `${fmt(p._sum.totalAmount ?? 0).padStart(12)} | ${productCount} products`,
    );
  }

  // ---------------------------------------------------------------------------
  // Headline KPIs across all platforms
  // ---------------------------------------------------------------------------
  console.log("\n💰 HEADLINE KPIs (paid orders, all platforms)");
  const kpis = await db.order.aggregate({
    where: { financialStatus: "paid" },
    _count: true,
    _sum: { totalAmount: true },
    _avg: { totalAmount: true },
  });
  console.log(`  Total Revenue : ${fmt(kpis._sum.totalAmount ?? 0)}`);
  console.log(`  Total Orders  : ${kpis._count}`);
  console.log(
    `  AOV           : ${fmt(Math.round(kpis._avg.totalAmount ?? 0))}`,
  );

  // ---------------------------------------------------------------------------
  // Daily revenue × platform (last 30 days, top 10 rows)
  // ---------------------------------------------------------------------------
  // Note: $queryRaw in SQLite can return bigint for SUM/COUNT. We type the
  // shape with `null` allowed and `bigint | number | null` for aggregates,
  // then normalize via Number() before formatting.
  console.log("\n📈 RECENT DAILY REVENUE × PLATFORM (top 10 rows)");
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const dailyRows = await db.$queryRaw<
    Array<{
      day: string | null;
      platform: string | null;
      revenue: number | bigint | null;
      orders: number | bigint | null;
    }>
  >`
    SELECT
      date(placedAt) as day,
      platform,
      CAST(SUM(totalAmount) AS INTEGER) as revenue,
      CAST(COUNT(*) AS INTEGER) as orders
    FROM "Order"
    WHERE placedAt >= ${thirtyDaysAgo} AND financialStatus = 'paid'
    GROUP BY day, platform
    ORDER BY day DESC, platform ASC
    LIMIT 10
  `;
  console.log(
    `  ${"Day".padEnd(12)} ${"Platform".padEnd(14)} ${"Revenue".padStart(12)}  Orders`,
  );
  for (const row of dailyRows) {
    const day = (row.day ?? "(unknown)").padEnd(12);
    const platform = (row.platform ?? "(unknown)").padEnd(14);
    const revenue = fmt(Number(row.revenue ?? 0)).padStart(12);
    const orders = String(Number(row.orders ?? 0));
    console.log(`  ${day} ${platform} ${revenue}  ${orders}`);
  }

  // ---------------------------------------------------------------------------
  // Cross-platform top SKUs — the demo magic
  // ---------------------------------------------------------------------------
  console.log("\n🔗 TOP SKUs BY REVENUE — UNIFIED ACROSS PLATFORMS");
  const topSkus = await db.$queryRaw<
    Array<{
      sku: string | null;
      platforms: string | null;
      units: number | bigint | null;
      revenue: number | bigint | null;
    }>
  >`
    SELECT
      oi.sku,
      GROUP_CONCAT(DISTINCT o.platform) as platforms,
      CAST(SUM(oi.quantity) AS INTEGER) as units,
      CAST(SUM(oi.totalPrice) AS INTEGER) as revenue
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi.orderId
    WHERE o.financialStatus = 'paid' AND oi.sku IS NOT NULL AND oi.sku != ''
    GROUP BY oi.sku
    ORDER BY revenue DESC
    LIMIT 10
  `;
  console.log(
    `  ${"SKU".padEnd(20)} ${"Platforms".padEnd(28)} ${"Units".padStart(5)}  Revenue`,
  );
  for (const r of topSkus) {
    const sku = (r.sku ?? "(no sku)").padEnd(20);
    const platforms = (r.platforms ?? "").padEnd(28);
    const units = String(Number(r.units ?? 0)).padStart(5);
    console.log(
      `  ${sku} ${platforms} ${units}  ${fmt(Number(r.revenue ?? 0))}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Order status distribution
  // ---------------------------------------------------------------------------
  console.log("\n📊 ORDER STATUS DISTRIBUTION");
  const statusRows = await db.order.groupBy({
    by: ["platform", "financialStatus"],
    _count: true,
    orderBy: [{ platform: "asc" }, { financialStatus: "asc" }],
  });
  for (const r of statusRows) {
    console.log(
      `  ${r.platform.padEnd(14)} ${r.financialStatus.padEnd(12)} ${r._count}`,
    );
  }

  // ---------------------------------------------------------------------------
  // Sync state
  // ---------------------------------------------------------------------------
  console.log("\n⏱  SYNC STATE");
  const states = await db.syncState.findMany({ orderBy: { platform: "asc" } });
  for (const s of states) {
    console.log(
      `  ${s.platform.padEnd(14)} ${s.lastSyncStatus.padEnd(8)} ` +
        `at ${s.lastSyncedAt.toISOString()} ` +
        `(P:${s.productsSynced} O:${s.ordersSynced} C:${s.customersSynced})`,
    );
  }

  console.log("\n" + "=".repeat(75));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
