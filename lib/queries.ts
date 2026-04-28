// =============================================================================
// CROSS-PLATFORM ANALYTICS QUERIES
// =============================================================================
// All queries work against the canonical schema.
// No per-platform branching; query once, get results across all platforms.

'use server';

import { db } from '@/lib/db';
import { Money, moneyToString } from '@/lib/schema';

// =============================================================================
// REVENUE QUERIES
// =============================================================================

export async function getTotalRevenue(options?: {
  startDate?: Date;
  endDate?: Date;
  platform?: string;
}): Promise<Money> {
  const where: any = {
    financialStatus: 'paid',
  };

  if (options?.startDate) {
    where.createdAt = { gte: options.startDate };
  }
  if (options?.endDate) {
    if (!where.createdAt) where.createdAt = {};
    where.createdAt.lte = options.endDate;
  }
  if (options?.platform) {
    where.platform = options.platform;
  }

  const result = await db.order.aggregate({
    _sum: { total: true },
    where,
  });

  return result._sum.total || 0;
}

export async function getRevenueByDay(options?: {
  startDate?: Date;
  endDate?: Date;
  platform?: string;
}): Promise<
  Array<{
    date: string;
    revenue: Money;
    platform?: string;
    orderCount: number;
  }>
> {
  const where: any = {
    financialStatus: 'paid',
  };

  if (options?.startDate) {
    where.createdAt = { gte: options.startDate };
  }
  if (options?.endDate) {
    if (!where.createdAt) where.createdAt = {};
    where.createdAt.lte = options.endDate;
  }

  // Raw query to get timeseries data
  const orders = await db.order.findMany({
    where,
    select: {
      createdAt: true,
      total: true,
      platform: options?.platform ? undefined : true,
    },
  });

  // Group by date (and optionally by platform)
  const grouped = new Map<
    string,
    { revenue: Money; count: number; platform?: string }
  >();

  for (const order of orders) {
    const dateStr = order.createdAt.toISOString().split('T')[0];
    const key = options?.platform ? dateStr : `${dateStr}|${order.platform}`;
    const existing = grouped.get(key) || {
      revenue: 0,
      count: 0,
      platform: options?.platform || (order as any).platform,
    };
    grouped.set(key, {
      revenue: existing.revenue + order.total,
      count: existing.count + 1,
      platform: existing.platform,
    });
  }

  return Array.from(grouped.entries()).map(([key, value]) => ({
    date: key.includes('|') ? key.split('|')[0] : key,
    revenue: value.revenue,
    platform: value.platform,
    orderCount: value.count,
  }));
}

export async function getAverageOrderValue(options?: {
  startDate?: Date;
  endDate?: Date;
  platform?: string;
}): Promise<Money> {
  const where: any = {
    financialStatus: 'paid',
  };

  if (options?.startDate) {
    where.createdAt = { gte: options.startDate };
  }
  if (options?.endDate) {
    if (!where.createdAt) where.createdAt = {};
    where.createdAt.lte = options.endDate;
  }
  if (options?.platform) {
    where.platform = options.platform;
  }

  const result = await db.order.aggregate({
    _avg: { total: true },
    _count: true,
    where,
  });

  return result._avg.total ? Math.round(result._avg.total) : 0;
}

// =============================================================================
// PRODUCT QUERIES
// =============================================================================

export async function getProductsBySkuAndPlatform(sku: string): Promise<
  Array<{
    id: string;
    sku: string;
    platform: string;
    title: string;
    price: Money;
    inventory: number | null;
    currency: string;
  }>
> {
  const products = await db.product.findMany({
    where: { sku },
    select: {
      id: true,
      sku: true,
      platform: true,
      title: true,
      price: true,
      inventory: true,
      currency: true,
    },
  });

  return products.map((p) => ({
    ...p,
    sku: p.sku!,
  }));
}

export async function getTopProductsBySku(limit: number = 10): Promise<
  Array<{
    sku: string;
    title: string;
    unitsSold: number;
    revenue: Money;
    platformCount: number;
    platforms: string[];
  }>
> {
  // Group line items by SKU to get units sold and revenue
  const lineItems = await db.lineItem.findMany({
    where: { sku: { not: null } },
    select: {
      sku: true,
      title: true,
      quantity: true,
      total: true,
    },
  });

  const grouped = new Map<
    string,
    {
      sku: string;
      titles: Set<string>;
      unitsSold: number;
      revenue: Money;
      platforms: Set<string>;
    }
  >();

  for (const item of lineItems) {
    const sku = item.sku!;
    const existing = grouped.get(sku) || {
      sku,
      titles: new Set(),
      unitsSold: 0,
      revenue: 0,
      platforms: new Set(),
    };
    existing.titles.add(item.title);
    existing.unitsSold += item.quantity;
    existing.revenue += item.total;
    grouped.set(sku, existing);
  }

  // Get platform info
  const productsWithPlatform = await db.product.findMany({
    where: { sku: { in: Array.from(grouped.keys()) } },
    select: { sku: true, platform: true },
  });

  for (const prod of productsWithPlatform) {
    if (prod.sku) {
      const group = grouped.get(prod.sku);
      if (group) {
        group.platforms.add(prod.platform);
      }
    }
  }

  return Array.from(grouped.values())
    .map((g) => ({
      sku: g.sku,
      title: Array.from(g.titles)[0] || 'Unknown',
      unitsSold: g.unitsSold,
      revenue: g.revenue,
      platformCount: g.platforms.size,
      platforms: Array.from(g.platforms),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

// =============================================================================
// CUSTOMER QUERIES
// =============================================================================

export async function getCustomerLifetimeValue(email: string): Promise<{
  email: string;
  platforms: string[];
  orderCount: number;
  totalSpent: Money;
  firstOrder: Date | null;
  lastOrder: Date | null;
}> {
  const orders = await db.order.findMany({
    where: {
      OR: [{ customerEmail: email }, { customer: { email } }],
      financialStatus: 'paid',
    },
    select: {
      total: true,
      createdAt: true,
      platform: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const platforms = new Set<string>();
  let totalSpent = 0;
  let firstOrder: Date | null = null;
  let lastOrder: Date | null = null;

  for (const order of orders) {
    platforms.add(order.platform);
    totalSpent += order.total;
    lastOrder = order.createdAt;
    if (!firstOrder) {
      firstOrder = order.createdAt;
    }
  }

  return {
    email,
    platforms: Array.from(platforms),
    orderCount: orders.length,
    totalSpent,
    firstOrder,
    lastOrder,
  };
}

export async function getTopCustomersBySpend(limit: number = 10): Promise<
  Array<{
    email: string;
    totalSpent: Money;
    orderCount: number;
    platforms: string[];
  }>
> {
  const orders = await db.order.findMany({
    where: { financialStatus: 'paid' },
    select: {
      customerEmail: true,
      total: true,
      platform: true,
    },
  });

  const customerMap = new Map<
    string,
    { totalSpent: Money; count: number; platforms: Set<string> }
  >();

  for (const order of orders) {
    if (!order.customerEmail) continue;
    const existing = customerMap.get(order.customerEmail) || {
      totalSpent: 0,
      count: 0,
      platforms: new Set(),
    };
    existing.totalSpent += order.total;
    existing.count += 1;
    existing.platforms.add(order.platform);
    customerMap.set(order.customerEmail, existing);
  }

  return Array.from(customerMap.entries())
    .map(([email, data]) => ({
      email,
      totalSpent: data.totalSpent,
      orderCount: data.count,
      platforms: Array.from(data.platforms),
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);
}

// =============================================================================
// ORDER STATUS QUERIES
// =============================================================================

export async function getOrderCountByFinancialStatus(platform?: string): Promise<
  Array<{
    status: string;
    count: number;
    revenue: Money;
  }>
> {
  const where: any = {};
  if (platform) {
    where.platform = platform;
  }

  const counts = await db.order.groupBy({
    by: ['financialStatus'],
    where,
    _count: true,
    _sum: { total: true },
  });

  return counts.map((c) => ({
    status: c.financialStatus,
    count: c._count,
    revenue: c._sum.total || 0,
  }));
}

export async function getOrderCountByFulfillmentStatus(
  platform?: string
): Promise<
  Array<{
    status: string;
    count: number;
  }>
> {
  const where: any = {};
  if (platform) {
    where.platform = platform;
  }

  const counts = await db.order.groupBy({
    by: ['fulfillmentStatus'],
    where,
    _count: true,
  });

  return counts.map((c) => ({
    status: c.fulfillmentStatus,
    count: c._count,
  }));
}

export async function getUnpaidOrders(): Promise<
  Array<{
    id: string;
    platformId: string;
    platform: string;
    customerEmail: string | null;
    total: Money;
    createdAt: Date;
  }>
> {
  return db.order.findMany({
    where: {
      financialStatus: { in: ['pending', 'refunded', 'cancelled'] },
    },
    select: {
      id: true,
      platformId: true,
      platform: true,
      customerEmail: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getUnshippedOrders(): Promise<
  Array<{
    id: string;
    platformId: string;
    platform: string;
    customerEmail: string | null;
    total: Money;
    createdAt: Date;
  }>
> {
  return db.order.findMany({
    where: {
      fulfillmentStatus: { in: ['pending', 'unshipped', 'processing'] },
    },
    select: {
      id: true,
      platformId: true,
      platform: true,
      customerEmail: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

// =============================================================================
// PLATFORM DISTRIBUTION
// =============================================================================

export async function getRevenueByPlatform(): Promise<
  Array<{
    platform: string;
    revenue: Money;
    orderCount: number;
    averageOrder: Money;
  }>
> {
  const aggregates = await db.order.groupBy({
    by: ['platform'],
    where: { financialStatus: 'paid' },
    _sum: { total: true },
    _count: true,
    _avg: { total: true },
  });

  return aggregates.map((a) => ({
    platform: a.platform,
    revenue: a._sum.total || 0,
    orderCount: a._count,
    averageOrder: a._avg.total ? Math.round(a._avg.total) : 0,
  }));
}

export async function getProductCountByPlatform(): Promise<
  Array<{
    platform: string;
    count: number;
  }>
> {
  const counts = await db.product.groupBy({
    by: ['platform'],
    _count: true,
  });

  return counts.map((c) => ({
    platform: c.platform,
    count: c._count,
  }));
}
