import "dotenv/config";
import { syncAll } from "@/lib/sync/sync-all";

async function main() {
  console.log("Syncing all connectors...\n");
  const results = await syncAll();

  for (const r of results) {
    if (r.status === "success") {
      console.log(
        `  ${r.platform.padEnd(14)} ${String(r.productsSynced).padStart(3)} products, ` +
          `${String(r.ordersSynced).padStart(3)} orders, ${String(r.customersSynced).padStart(3)} customers ` +
          `(${r.durationMs}ms)`,
      );
    } else {
      console.log(`ERROR: ${r.platform.padEnd(14)} failed: ${r.error}`);
    }
  }

  const ok = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;
  console.log(`\nDone: ${ok} succeeded, ${failed} failed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
