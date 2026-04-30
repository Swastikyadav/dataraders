"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CustomerRow = {
  id: string;
  platform: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  ordersCount: number;
  totalSpent: number;
  createdAt: Date;
};

export type CustomersResult = {
  rows: CustomerRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function getCustomers(opts?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<CustomersResult> {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 20));
  const search = opts?.search?.trim();

  const where = search
    ? {
        OR: [
          { email: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
        ],
      }
    : undefined;

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      select: {
        id: true,
        platform: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
    }),
    db.customer.count({ where }),
  ]);

  const ids = customers.map((c) => c.id);
  const totals = ids.length
    ? await db.$queryRaw<
        Array<{ customerId: string; orders: number | bigint; spent: number | bigint }>
      >`
        SELECT
          customerId,
          CAST(COUNT(*) AS INTEGER) as orders,
          CAST(SUM(totalAmount) AS INTEGER) as spent
        FROM "Order"
        WHERE financialStatus = 'paid'
          AND customerId IN (${Prisma.join(ids)})
        GROUP BY customerId
      `
    : [];

  const totalsByCustomer = new Map(
    totals.map((t) => [
      t.customerId,
      { orders: Number(t.orders ?? 0), spent: Number(t.spent ?? 0) },
    ]),
  );

  const rows: CustomerRow[] = customers.map((c) => {
    const t = totalsByCustomer.get(c.id);
    return {
      ...c,
      ordersCount: t?.orders ?? 0,
      totalSpent: t?.spent ?? 0,
    };
  });

  return { rows, total, page, pageSize };
}
