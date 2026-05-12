"use client";

import { type ColumnDef } from "@tanstack/react-table";

import { DataTable } from "@/components/ui/dataTable";
import type { ProductSummary } from "@/lib/actions/products";
import { formatMoney, formatNumber } from "@/lib/utils";

const PLATFORM_LABEL: Record<string, string> = {
  shopify: "Shopify",
  amazon: "Amazon",
  etsy: "Etsy",
  woocommerce: "WooCommerce",
};

const formatPlatform = (p: string) => PLATFORM_LABEL[p] ?? p;

const columns: ColumnDef<ProductSummary>[] = [
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.sku}</span>
    ),
  },
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => (
      <span className="block max-w-md truncate text-xs">
        {row.original.title}
      </span>
    ),
  },
  {
    accessorKey: "platforms",
    header: "Channels",
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        {row.original.platforms.map((p) => (
          <span
            key={p}
            className="border border-outline-variant px-1.5 py-0.5 text-label-sm font-bold uppercase tracking-architectural text-on-surface-variant"
          >
            {formatPlatform(p)}
          </span>
        ))}
      </div>
    ),
  },
  {
    accessorKey: "unitsSold",
    header: "Units",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {formatNumber(row.original.unitsSold)}
      </span>
    ),
  },
  {
    accessorKey: "revenue",
    header: "Revenue",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-primary">
        {formatMoney(row.original.revenue)}
      </span>
    ),
  },
];

type Props = {
  data: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
  filterSummary?: string;
};

export function ProductsTableClient({
  data,
  total,
  page,
  pageSize,
  filterSummary,
}: Props) {
  return (
    <DataTable
      columns={columns}
      data={data}
      title={
        filterSummary
          ? `Top Selling Products · ${filterSummary}`
          : "Top Selling Products"
      }
      emptyMessage={
        filterSummary
          ? "None of these SKUs have paid orders yet."
          : "No products yet — trigger a sync to populate."
      }
      pagination={{ total, page, pageSize }}
    />
  );
}
