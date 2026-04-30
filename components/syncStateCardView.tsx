"use client";

import { useTransition } from "react";
import { Cpu } from "lucide-react";

import { runSync, type SyncStateRow } from "@/lib/actions/sync";
import { cn } from "@/lib/utils";

type Props = {
  states: SyncStateRow[];
};

const formatTimestamp = (d: Date) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

export function SyncStateCardView({ states }: Props) {
  const [syncing, startSync] = useTransition();

  const total = states.length;
  const failing = states.filter((s) => s.lastSyncStatus === "error").length;
  const succeeded = states.filter((s) => s.lastSyncStatus === "success").length;

  const latestSync = states.reduce<Date | null>((latest, s) => {
    const at = new Date(s.lastSyncedAt);
    return !latest || at > latest ? at : latest;
  }, null);

  const totalOrders = states.reduce((s, x) => s + x.ordersSynced, 0);
  const totalProducts = states.reduce((s, x) => s + x.productsSynced, 0);
  const totalCustomers = states.reduce((s, x) => s + x.customersSynced, 0);

  const headline =
    total === 0
      ? "Awaiting First Sync"
      : failing === 0
        ? "Engine: Optimal"
        : failing === total
          ? "Engine: Down"
          : `${failing} of ${total} Connectors Failing`;

  const description =
    total === 0
      ? "No connectors have run yet. Trigger a sync to populate the dashboard."
      : latestSync
        ? `Last synced ${formatTimestamp(latestSync)} · ${totalOrders} orders, ${totalProducts} products, ${totalCustomers} customers across ${succeeded}/${total} connectors.`
        : "Sync state unavailable.";

  const handleSync = () => {
    startSync(async () => {
      await runSync();
    });
  };

  return (
    <div className="relative flex flex-col justify-between overflow-hidden rounded-sm bg-primary p-6 text-on-primary">
      <div className="relative z-10">
        <span className="text-label-sm font-bold uppercase tracking-brand text-on-primary/60">
          Connector Sync
        </span>
        <h4 className="mt-2 text-md font-bold leading-tight">{headline}</h4>
        <p className="mt-4 text-xs text-on-primary/70">{description}</p>
      </div>

      <div className="relative z-10 mt-8 flex gap-2">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className={cn(
            "flex-1 bg-on-primary py-2 text-xs font-bold uppercase tracking-widest text-primary transition-colors duration-50 ease-technical",
            syncing
              ? "cursor-wait opacity-60"
              : "cursor-pointer hover:bg-surface-container-highest",
          )}
        >
          {syncing ? "Syncing…" : "Run Sync Now"}
        </button>
      </div>

      <Cpu
        className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 text-on-primary opacity-10"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </div>
  );
}
