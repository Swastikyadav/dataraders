"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { rangeStart, type DateRange } from "./_shared";

export type TopProduct = {
  sku: string;
  title: string;
  platforms: string[];
  unitsSold: number;
  revenue: number;
};

export async function getTopProducts(opts?: {
  range?: DateRange;
  limit?: number;
}): Promise<TopProduct[]> {
  const range = opts?.range ?? "all";
  const limit = Math.min(100, Math.max(1, opts?.limit ?? 10));
  const start = rangeStart(range);

  const dateFilter = start
    ? Prisma.sql`AND o.placedAt >= ${start}`
    : Prisma.empty;

  const rows = await db.$queryRaw<
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
    GROUP BY oi.sku
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;

  return rows.map((r) => ({
    sku: r.sku,
    title: r.title,
    platforms: (r.platforms ?? "").split(",").filter(Boolean),
    unitsSold: Number(r.units ?? 0),
    revenue: Number(r.revenue ?? 0),
  }));
}
