import { SyncStateTableClient } from "@/components/syncStateTable/syncStateTableClient";
import { getSyncState } from "@/lib/actions/sync";

export async function SyncStateTable() {
  const data = await getSyncState();
  return <SyncStateTableClient data={data} />;
}
