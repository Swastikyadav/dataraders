"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DataTable } from "@/components/ui/dataTable";
import type { CustomerRow } from "@/lib/actions/customers";
import { cn, formatMoney, formatNumber } from "@/lib/utils";

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

export function CustomersTableView({
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
  const title = filterSummary
    ? `Customers · ${filterSummary}`
    : "Customers · Lifetime Value";
  const empty = filterSummary
    ? "No customers match this filter."
    : "No customers yet — trigger a sync to populate.";

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
        title={title}
        emptyMessage={empty}
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
