"use server";

import { db } from "@/lib/db";

export type SyncStateRow = {
  id: string;
  platform: string;
  lastSyncedAt: Date;
  lastSyncStatus: string;
  lastSyncError: string | null;
  ordersSynced: number;
  productsSynced: number;
  customersSynced: number;
};

export async function getSyncState(): Promise<SyncStateRow[]> {
  return db.syncState.findMany({ orderBy: { platform: "asc" } });
}
