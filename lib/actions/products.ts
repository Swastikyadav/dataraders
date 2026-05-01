"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { rangeStart, type DateRange } from "./_shared";

export type ProductSummary = {
  sku: string;
  title: string;
  platforms: string[];
  unitsSold: number;
  revenue: number;
};

export type ProductsResult = {
  rows: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getProducts(opts?: {
  range?: DateRange;
  skus?: string[];
  page?: number;
  pageSize?: number;
}): Promise<ProductsResult> {
  const range = opts?.range ?? "all";
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const start = rangeStart(range);
  const offset = (page - 1) * pageSize;

  const dateFilter = start
    ? Prisma.sql`AND o.placedAt >= ${start}`
    : Prisma.empty;

  const skusList = opts?.skus?.filter((s) => s.length > 0) ?? [];
  const skusFilter =
    skusList.length > 0
      ? Prisma.sql`AND oi.sku IN (${Prisma.join(skusList)})`
      : Prisma.empty;

  const [rawRows, countRows] = await Promise.all([
    db.$queryRaw<
      Array<{
        sku: string;
        title: string;
        platforms: string | null;
        units: number | bigint | null;
        revenue: number | bigint | null;
      }>
    >`
      SELECT
        oi.sku as sku,
        MIN(oi.title) as title,
        GROUP_CONCAT(DISTINCT o.platform) as platforms,
        CAST(SUM(oi.quantity) AS INTEGER) as units,
        CAST(SUM(oi.totalPrice) AS INTEGER) as revenue
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi.orderId
      WHERE o.financialStatus = 'paid'
        AND oi.sku IS NOT NULL AND oi.sku != ''
        ${dateFilter}
        ${skusFilter}
      GROUP BY oi.sku
      ORDER BY revenue DESC
      LIMIT ${pageSize}
      OFFSET ${offset}
    `,
    db.$queryRaw<Array<{ count: number | bigint }>>`
      SELECT COUNT(DISTINCT oi.sku) as count
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi.orderId
      WHERE o.financialStatus = 'paid'
        AND oi.sku IS NOT NULL AND oi.sku != ''
        ${dateFilter}
        ${skusFilter}
    `,
  ]);

  const rows: ProductSummary[] = rawRows.map((r) => ({
    sku: r.sku,
    title: r.title,
    platforms: (r.platforms ?? "").split(",").filter(Boolean),
    unitsSold: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }));

  const total = Number(countRows[0]?.count ?? 0);

  return { rows, total, page, pageSize };
}
