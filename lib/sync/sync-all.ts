import { db } from "@/lib/db";
import { getAllConnectors } from "@/lib/connectors";
import { syncConnector, type SyncResult } from "./sync";

// =============================================================================
// SYNC ALL CONNECTORS
// =============================================================================
// Runs every registered connector independently. One connector's failure
// does NOT affect others — successes are committed, failures are logged
// per-platform in SyncState.

export async function syncAll(): Promise<SyncResult[]> {
  const connectors = getAllConnectors();
  const results: SyncResult[] = [];

  for (const connector of connectors) {
    const result = await syncConnector(db, connector);
    results.push(result);
  }

  return results;
}
