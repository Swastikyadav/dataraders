import { SyncStateCardClient } from "@/components/syncStateCard/syncStateCardClient";
import { getSyncState } from "@/lib/actions/sync";

export async function SyncStateCard() {
  const states = await getSyncState();
  return <SyncStateCardClient states={states} />;
}
