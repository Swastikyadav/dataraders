import { SyncStateCardView } from "@/components/syncStateCardView";
import { getSyncState } from "@/lib/actions/sync";

export async function SyncStateCard() {
  const states = await getSyncState();
  return <SyncStateCardView states={states} />;
}
