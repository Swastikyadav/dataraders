"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/dataTable";
import type { SyncStateRow } from "@/lib/actions/sync";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  success: "bg-positive",
  error: "bg-accent-magenta",
  partial: "bg-outline",
};

const formatPlatform = (p: string) => p.charAt(0).toUpperCase() + p.slice(1);

const formatDateTime = (d: Date) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const columns: ColumnDef<SyncStateRow>[] = [
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => (
      <span className="text-xs font-normal">
        {formatPlatform(row.original.platform)}
      </span>
    ),
  },
  {
    accessorKey: "lastSyncStatus",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.lastSyncStatus;
      const cls = STATUS_CLASS[status] ?? "bg-outline";
      return (
        <span
          className={cn(
            "px-4 py-0.5 flex items-center justify-center w-1/2 text-xs text-on-primary",
            cls,
          )}
        >
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "lastSyncedAt",
    header: "Last Synced",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {formatDateTime(row.original.lastSyncedAt)}
      </span>
    ),
  },
  {
    accessorKey: "ordersSynced",
    header: "Orders",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.ordersSynced}</span>
    ),
  },
  {
    accessorKey: "productsSynced",
    header: "Products",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.productsSynced}</span>
    ),
  },
  {
    accessorKey: "customersSynced",
    header: "Customers",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.customersSynced}</span>
    ),
  },
];

type Props = {
  data: SyncStateRow[];
};

export function SyncStateTableClient({ data }: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      title="Connector Sync State"
      emptyMessage="No sync runs yet, trigger a sync from the top bar."
    />
  );
}
