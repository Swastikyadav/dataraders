import { SalesChartClient } from "@/components/salesChart/salesChartClient";
import { getOrders } from "@/lib/actions/orders";
import { type DateRange } from "@/lib/actions/_shared";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const DAYS_BY_RANGE: Record<DateRange, number> = {
  "7d": 7,
  "28d": 28,
  "90d": 90,
  all: 90,
};

const RANGE_LABEL: Record<DateRange, string> = {
  "7d": "Last 7 Days",
  "28d": "Last 28 Days",
  "90d": "Last 90 Days",
  all: "Last 90 Days · All Time",
};

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function bucketLabel(date: Date, days: number) {
  if (days <= 7) return DAY_LABELS[date.getDay()];
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

type Props = {
  range?: DateRange;
};

export async function SalesChart({ range = "all" }: Props) {
  const days = DAYS_BY_RANGE[range];
  // The line chart caps at 90 daily buckets even for "all"; we still pass
  // a bounded range to getOrders so SQLite isn't asked to scan everything.
  const queryRange: DateRange = range === "all" ? "90d" : range;
  const { rows } = await getOrders({
    range: queryRange,
    financialStatus: "paid",
    pageSize: 100,
  });

  const today = startOfDay(new Date());
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - 1 - i));
    return { date, label: bucketLabel(date, days), revenue: 0 };
  });

  for (const row of rows) {
    const placed = startOfDay(new Date(row.placedAt));
    const bucket = buckets.find((b) => b.date.getTime() === placed.getTime());
    if (bucket) bucket.revenue += row.totalAmount;
  }

  const data = buckets.map((b) => ({ day: b.label, revenue: b.revenue }));

  return (
    <section className="flex h-125 flex-col rounded-sm border border-outline-variant bg-surface-container-lowest">
      <header className="flex items-center justify-between border-b border-outline-variant px-6 py-4">
        <h2 className="text-xs font-bold uppercase tracking-brand text-primary">
          Master Sales Performance
        </h2>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 bg-accent-magenta" />
          <span className="text-label-sm font-bold uppercase text-outline">
            {RANGE_LABEL[range]}
          </span>
        </div>
      </header>
      <div className="flex-1 p-6">
        <SalesChartClient data={data} />
      </div>
    </section>
  );
}
