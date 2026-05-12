"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/dataTable";
import type { OrderRow } from "@/lib/actions/orders";
import { cn, formatMoney } from "@/lib/utils";

const STATUS_CLASS: Record<string, string> = {
  paid: "bg-positive",
  refunded: "bg-accent-magenta",
  pending: "bg-outline",
  cancelled: "bg-outline",
};

const PLATFORM_LABEL: Record<string, string> = {
  shopify: "Shopify",
  amazon: "Amazon",
  etsy: "Etsy",
  woocommerce: "WooCommerce",
};

const formatDateTime = (d: Date) =>
  new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const columns: ColumnDef<OrderRow>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.orderNumber}</span>
    ),
  },
  {
    accessorKey: "platform",
    header: "Platform",
    cell: ({ row }) => (
      <span className="text-xs">
        {PLATFORM_LABEL[row.original.platform] ?? row.original.platform}
      </span>
    ),
  },
  {
    accessorKey: "customerEmail",
    header: "Customer",
    cell: ({ row }) => (
      <span className="block max-w-xs truncate text-xs text-on-surface-variant">
        {row.original.customerEmail ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "financialStatus",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.financialStatus;
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
    accessorKey: "itemsCount",
    header: "Items",
    meta: { align: "right" },
    cell: ({ row }) => {
      const count = row.original.itemsCount;
      const skus = row.original.itemSkus;
      if (count === 0 || skus.length === 0) {
        return (
          <span className="font-mono text-xs text-on-surface-variant">
            {count}
          </span>
        );
      }
      return (
        <Link
          href={`/analytics?skus=${encodeURIComponent(skus.join(","))}`}
          className="inline-block font-mono text-xs underline decoration-outline-variant decoration-1 underline-offset-4 transition-colors duration-50 ease-technical hover:text-primary hover:decoration-primary text-accent-magenta"
        >
          {count}
        </Link>
      );
    },
  },
  {
    accessorKey: "placedAt",
    header: "Placed",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {formatDateTime(row.original.placedAt)}
      </span>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: "Total",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-primary">
        {formatMoney(row.original.totalAmount, row.original.currency)}
      </span>
    ),
  },
];

type Props = {
  data: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
  filterSummary?: string;
};

export function OrdersTableClient({
  data,
  total,
  page,
  pageSize,
  filterSummary,
}: Props) {
  const title = filterSummary ? `Orders · ${filterSummary}` : "Recent Orders";
  const empty = filterSummary
    ? "No orders match this filter."
    : "No orders yet — trigger a sync to populate.";

  return (
    <DataTable
      columns={columns}
      data={data}
      title={title}
      emptyMessage={empty}
      pagination={{ total, page, pageSize }}
    />
  );
}
