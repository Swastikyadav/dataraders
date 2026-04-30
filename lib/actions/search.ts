"use server";

import { db } from "@/lib/db";

export type OrderHit = {
  id: string;
  platform: string;
  orderNumber: string;
  customerEmail: string | null;
  totalAmount: number;
  currency: string;
  placedAt: Date;
};

export type CustomerHit = {
  id: string;
  platform: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type ProductHit = {
  id: string;
  platform: string;
  title: string;
  sku: string | null;
  priceAmount: number;
  priceCurrency: string;
};

export type SearchResults = {
  orders: OrderHit[];
  customers: CustomerHit[];
  products: ProductHit[];
};

const RESULTS_PER_GROUP = 5;
const EMPTY: SearchResults = { orders: [], customers: [], products: [] };

export async function searchAll(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return EMPTY;

  const [orders, customers, products] = await Promise.all([
    db.order.findMany({
      where: {
        OR: [
          { orderNumber: { contains: q } },
          { customerEmail: { contains: q } },
        ],
      },
      orderBy: { placedAt: "desc" },
      take: RESULTS_PER_GROUP,
      select: {
        id: true,
        platform: true,
        orderNumber: true,
        customerEmail: true,
        totalAmount: true,
        currency: true,
        placedAt: true,
      },
    }),
    db.customer.findMany({
      where: {
        OR: [
          { email: { contains: q } },
          { firstName: { contains: q } },
          { lastName: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: RESULTS_PER_GROUP,
      select: {
        id: true,
        platform: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    }),
    db.product.findMany({
      where: {
        OR: [{ title: { contains: q } }, { sku: { contains: q } }],
      },
      orderBy: { updatedAt: "desc" },
      take: RESULTS_PER_GROUP,
      select: {
        id: true,
        platform: true,
        title: true,
        sku: true,
        priceAmount: true,
        priceCurrency: true,
      },
    }),
  ]);

  return { orders, customers, products };
}
