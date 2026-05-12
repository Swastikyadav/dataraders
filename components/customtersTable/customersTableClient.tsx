"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/dataTable";
import type { CustomerRow } from "@/lib/actions/customers";
import { formatMoney, formatNumber } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  shopify: "Shopify",
  amazon: "Amazon",
  etsy: "Etsy",
  woocommerce: "WooCommerce",
};

const fullName = (c: CustomerRow) =>
  [c.firstName, c.lastName].filter(Boolean).join(" ").trim() || "—";

const columns: ColumnDef<CustomerRow>[] = [
  {
    accessorKey: "name",
    header: "Customer",
    cell: ({ row }) => (
      <span className="text-xs font-medium">{fullName(row.original)}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="block max-w-xs truncate text-xs text-on-surface-variant">
        {row.original.email ?? "—"}
      </span>
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
    accessorKey: "ordersCount",
    header: "Orders",
    meta: { align: "right" },
    cell: ({ row }) => {
      const count = row.original.ordersCount;
      if (count === 0) {
        return (
          <span className="font-mono text-xs text-on-surface-variant">0</span>
        );
      }
      return (
        <Link
          href={`/orders?customerId=${encodeURIComponent(row.original.id)}`}
          className="inline-block font-mono text-accent-magenta text-xs underline decoration-outline-variant decoration-1 underline-offset-4 transition-colors duration-50 ease-technical hover:text-primary hover:decoration-primary"
        >
          {formatNumber(count)}
        </Link>
      );
    },
  },
  {
    accessorKey: "totalSpent",
    header: "LTV",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-primary">
        {formatMoney(row.original.totalSpent)}
      </span>
    ),
  },
];

type Props = {
  data: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
  filterSummary?: string;
};

export function CustomersTableClient({
  data,
  total,
  page,
  pageSize,
  filterSummary,
}: Props) {
  const title = filterSummary
    ? `Customers · ${filterSummary}`
    : "Customers · Lifetime Value";
  const empty = filterSummary
    ? "No customers match this filter."
    : "No customers yet — trigger a sync to populate.";

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
