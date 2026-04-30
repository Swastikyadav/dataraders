"use server";

import { db } from "@/lib/db";
import { rangeStart, type DateRange } from "./_shared";

export type KpiSnapshot = {
  totalRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  totalCustomers: number;
  returnRate: number;
  range: DateRange;
};

export async function getKpis(
  range: DateRange = "all",
): Promise<KpiSnapshot> {
  const start = rangeStart(range);
  const placedAt = start ? { gte: start } : undefined;

  const [paid, refundedCount, totalCustomers] = await Promise.all([
    db.order.aggregate({
      where: {
        financialStatus: "paid",
        ...(placedAt ? { placedAt } : {}),
      },
      _count: true,
      _sum: { totalAmount: true },
      _avg: { totalAmount: true },
    }),
    db.order.count({
      where: {
        financialStatus: "refunded",
        ...(placedAt ? { placedAt } : {}),
      },
    }),
    db.customer.count(),
  ]);

  const paidCount = paid._count;
  const denom = paidCount + refundedCount;

  return {
    totalRevenue: paid._sum.totalAmount ?? 0,
    averageOrderValue: Math.round(paid._avg.totalAmount ?? 0),
    totalOrders: paidCount,
    totalCustomers,
    returnRate: denom > 0 ? refundedCount / denom : 0,
    range,
  };
}
