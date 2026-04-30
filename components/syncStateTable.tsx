import { SyncStateTableView } from "@/components/syncStateTableView";
import { getSyncState } from "@/lib/actions/sync";

export async function SyncStateTable() {
  const data = await getSyncState();
  return <SyncStateTableView data={data} />;
}
