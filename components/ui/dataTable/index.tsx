"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import {
  DataTablePagination,
  type DataTablePaginationProps,
} from "@/components/ui/dataTable/dataTablePagination";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: "left" | "right" | "center";
  }
}

import type { RowData } from "@tanstack/react-table";

type Props<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<T, any>[];
  data: T[];
  title?: string;
  emptyMessage?: string;
  pagination?: DataTablePaginationProps;
};

export function DataTable<T>({
  columns,
  data,
  title,
  emptyMessage = "No records found.",
  pagination,
}: Props<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const alignClass = (align?: "left" | "right" | "center") =>
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-sm border border-outline-variant bg-surface-container-lowest">
        {title && (
          <div className="border-b border-outline-variant bg-surface-container-low px-4 py-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
              {title}
            </h3>
          </div>
        )}
        <table className="w-full border-collapse text-left">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr
                key={hg.id}
                className="border-b border-outline-variant bg-surface-container-low"
              >
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className={cn(
                      "px-4 py-2 text-xs uppercase text-outline",
                      alignClass(h.column.columnDef.meta?.align),
                    )}
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-xs text-on-surface-variant"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-default transition-colors duration-50 ease-technical hover:bg-surface-container-highest"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-3",
                        alignClass(cell.column.columnDef.meta?.align),
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {pagination && <DataTablePagination {...pagination} />}
    </div>
  );
}
