// test-all-connectors.ts
import "dotenv/config";
import { getAllConnectors } from "./lib/connectors";

async function main() {
  const connectors = getAllConnectors();
  console.log(`🧪 Testing ${connectors.length} connectors\n`);

  let totalProducts = 0,
    totalOrders = 0,
    totalRevenue = 0;

  for (const c of connectors) {
    const products = await c.fetchProducts();
    const orders = await c.fetchOrders();
    const revenue = orders
      .filter((o) => o.financialStatus === "paid")
      .reduce((s, o) => s + o.totalAmount, 0);
    totalProducts += products.length;
    totalOrders += orders.length;
    totalRevenue += revenue;
    console.log(
      `${c.platform.toUpperCase().padEnd(14)} ${String(products.length).padStart(3)} products, ${String(orders.length).padStart(3)} orders, $${(revenue / 100).toFixed(2).padStart(10)} (paid)`,
    );

    for (const o of orders) {
      if (!Number.isInteger(o.totalAmount))
        throw new Error(`${c.platform}: ${o.orderNumber} totalAmount not int`);
      if (
        !["paid", "pending", "refunded", "cancelled"].includes(
          o.financialStatus,
        )
      )
        throw new Error(`${c.platform}: ${o.orderNumber} bad financialStatus`);
      if (
        !["fulfilled", "partial", "unfulfilled"].includes(o.fulfillmentStatus)
      )
        throw new Error(
          `${c.platform}: ${o.orderNumber} bad fulfillmentStatus`,
        );
      if (!(o.placedAt instanceof Date) || isNaN(o.placedAt.getTime()))
        throw new Error(`${c.platform}: ${o.orderNumber} bad placedAt`);
    }
  }

  console.log("─".repeat(60));
  console.log(
    `${"TOTAL".padEnd(14)} ${String(totalProducts).padStart(3)} products, ${String(totalOrders).padStart(3)} orders, $${(totalRevenue / 100).toFixed(2).padStart(10)} (paid)`,
  );

  // Cross-platform SKU check — the demo magic
  console.log("\n🔗 Cross-platform SKU coverage:");
  const skuToPlatforms = new Map<string, Set<string>>();
  for (const c of connectors) {
    const products = await c.fetchProducts();
    for (const p of products) {
      if (!p.sku) continue;
      if (!skuToPlatforms.has(p.sku)) skuToPlatforms.set(p.sku, new Set());
      skuToPlatforms.get(p.sku)!.add(c.platform);
    }
  }
  const multi = [...skuToPlatforms.entries()].filter(
    ([_, plats]) => plats.size > 1,
  );
  console.log(`   ${multi.length} SKUs are listed on 2+ platforms:`);
  for (const [sku, plats] of multi.sort((a, b) => b[1].size - a[1].size)) {
    console.log(`     ${sku.padEnd(20)} → ${[...plats].sort().join(", ")}`);
  }

  console.log("\n✅ All canonical invariants hold");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
