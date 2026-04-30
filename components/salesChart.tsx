import { SalesChartView } from "@/components/salesChartView";
import { getOrders } from "@/lib/actions/orders";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function startOfDay(d: Date) {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

export async function SalesChart() {
  const { rows } = await getOrders({
    range: "7d",
    financialStatus: "paid",
    pageSize: 100,
  });

  const today = startOfDay(new Date());
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (6 - i));
    return { date, label: DAY_LABELS[date.getDay()], revenue: 0 };
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
            Current Period
          </span>
        </div>
      </header>
      <div className="flex-1 p-6">
        <SalesChartView data={data} />
      </div>
    </section>
  );
}
