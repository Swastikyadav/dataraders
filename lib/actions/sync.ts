"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { syncAll } from "@/lib/sync/sync-all";

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

export type SyncSummary = {
  succeeded: number;
  failed: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  durationMs: number;
};

export async function getSyncState(): Promise<SyncStateRow[]> {
  return db.syncState.findMany({ orderBy: { platform: "asc" } });
}

export async function runSync(): Promise<SyncSummary> {
  const results = await syncAll();

  const summary: SyncSummary = {
    succeeded: 0,
    failed: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    durationMs: 0,
  };

  for (const r of results) {
    if (r.status === "success") summary.succeeded += 1;
    else summary.failed += 1;
    summary.totalOrders += r.ordersSynced;
    summary.totalProducts += r.productsSynced;
    summary.totalCustomers += r.customersSynced;
    summary.durationMs += r.durationMs;
  }

  revalidatePath("/", "layout");
  return summary;
}
