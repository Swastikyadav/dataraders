"use server";

import { db } from "@/lib/db";
import { rangeStart, type DateRange } from "./_shared";

export type OrderRow = {
  id: string;
  platform: string;
  orderNumber: string;
  customerEmail: string | null;
  totalAmount: number;
  currency: string;
  financialStatus: string;
  fulfillmentStatus: string;
  placedAt: Date;
};

export type OrdersResult = {
  rows: OrderRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getOrders(opts?: {
  range?: DateRange;
  platform?: string;
  financialStatus?: string;
  page?: number;
  pageSize?: number;
}): Promise<OrdersResult> {
  const range = opts?.range ?? "all";
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const start = rangeStart(range);

  const where = {
    ...(start ? { placedAt: { gte: start } } : {}),
    ...(opts?.platform ? { platform: opts.platform } : {}),
    ...(opts?.financialStatus
      ? { financialStatus: opts.financialStatus }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        platform: true,
        orderNumber: true,
        customerEmail: true,
        totalAmount: true,
        currency: true,
        financialStatus: true,
        fulfillmentStatus: true,
        placedAt: true,
      },
    }),
    db.order.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}
