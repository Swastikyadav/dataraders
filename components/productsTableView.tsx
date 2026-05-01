"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DataTable } from "@/components/ui/dataTable";
import type { ProductSummary } from "@/lib/actions/products";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

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

export function ProductsTableView({
  data,
  total,
  page,
  pageSize,
  filterSummary,
}: Props) {
  const searchParams = useSearchParams();
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const hrefForPage = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete("page");
    else params.set("page", String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
    <div className="flex flex-col gap-2">
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
      />
      {total > 0 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-label-sm uppercase tracking-architectural text-on-surface-variant">
            Showing {rangeStart}–{rangeEnd} of {total}
          </p>
          <nav className="flex items-center gap-2">
            <PageButton
              href={hrefForPage(page - 1)}
              disabled={!hasPrev}
              label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </PageButton>
            <span className="text-label-sm uppercase tracking-architectural text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <PageButton
              href={hrefForPage(page + 1)}
              disabled={!hasNext}
              label="Next page"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </PageButton>
          </nav>
        </div>
      )}
    </div>
  );
}

type PageButtonProps = {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
};

function PageButton({ href, disabled, label, children }: PageButtonProps) {
  const baseClass =
    "inline-flex h-7 w-7 items-center justify-center border border-outline-variant text-on-surface transition-colors duration-50 ease-technical";

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        aria-label={label}
        className={cn(baseClass, "cursor-not-allowed text-outline/40")}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(baseClass, "hover:border-primary hover:text-primary")}
    >
      {children}
    </Link>
  );
}
