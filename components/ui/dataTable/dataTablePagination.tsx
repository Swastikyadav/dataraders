"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type DataTablePaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  pageParam?: string;
};

export function DataTablePagination({
  total,
  page,
  pageSize,
  pageParam = "page",
}: DataTablePaginationProps) {
  const searchParams = useSearchParams();

  if (total <= 0) return null;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const hrefForPage = (target: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (target <= 1) params.delete(pageParam);
    else params.set(pageParam, String(target));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  };

  return (
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
