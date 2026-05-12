"use server";

import { db } from "@/lib/db";

const RECENT_DAYS = 30;
const BASELINE_DAYS = 60;
const MIN_RECENT_ORDERS = 10;
const MIN_RECENT_RATE = 0.05;
const SPIKE_RATIO = 2;
const BASELINE_RATE_FLOOR = 0.02;
const DAY_MS = 86_400_000;

export type Anomaly = {
  id: string;
  metric: "returnRate";
  sku: string;
  recentRate: number;
  baselineRate: number;
  ratio: number;
  recentOrders: number;
  detectedAt: Date;
  message: string;
};

export async function getAnomalies(): Promise<Anomaly[]> {
  const now = Date.now();
  const recentStart = new Date(now - RECENT_DAYS * DAY_MS);
  const baselineStart = new Date(now - (RECENT_DAYS + BASELINE_DAYS) * DAY_MS);
  const detectedAt = new Date(now);

  const rows = await db.$queryRaw<
    Array<{
      sku: string;
      recent_total: number | bigint;
      recent_refunded: number | bigint;
      baseline_total: number | bigint;
      baseline_refunded: number | bigint;
    }>
  >`
    SELECT
      oi.sku as sku,
      COUNT(DISTINCT CASE WHEN o.placedAt >= ${recentStart} THEN o.id END) as recent_total,
      COUNT(DISTINCT CASE WHEN o.placedAt >= ${recentStart} AND o.financialStatus = 'refunded' THEN o.id END) as recent_refunded,
      COUNT(DISTINCT CASE WHEN o.placedAt >= ${baselineStart} AND o.placedAt < ${recentStart} THEN o.id END) as baseline_total,
      COUNT(DISTINCT CASE WHEN o.placedAt >= ${baselineStart} AND o.placedAt < ${recentStart} AND o.financialStatus = 'refunded' THEN o.id END) as baseline_refunded
    FROM "OrderItem" oi
    JOIN "Order" o ON o.id = oi.orderId
    WHERE oi.sku IS NOT NULL AND oi.sku != ''
      AND o.placedAt >= ${baselineStart}
    GROUP BY oi.sku
  `;

  const anomalies: Anomaly[] = [];

  for (const r of rows) {
    const recentTotal = Number(r.recent_total);
    const recentRefunded = Number(r.recent_refunded);
    const baselineTotal = Number(r.baseline_total);
    const baselineRefunded = Number(r.baseline_refunded);

    if (recentTotal < MIN_RECENT_ORDERS) continue;
    if (baselineTotal === 0) continue;

    const recentRate = recentRefunded / recentTotal;
    if (recentRate < MIN_RECENT_RATE) continue;

    const rawBaselineRate = baselineRefunded / baselineTotal;
    const ratio = recentRate / Math.max(rawBaselineRate, BASELINE_RATE_FLOOR);
    if (ratio < SPIKE_RATIO) continue;

    anomalies.push({
      id: `return-rate:${r.sku}`,
      metric: "returnRate",
      sku: r.sku,
      recentRate,
      baselineRate: rawBaselineRate,
      ratio,
      recentOrders: recentTotal,
      detectedAt,
      message: `Anomaly detected in Return Rate for ${r.sku}`,
    });
  }

  anomalies.sort((a, b) => b.ratio - a.ratio);
  return anomalies;
}
