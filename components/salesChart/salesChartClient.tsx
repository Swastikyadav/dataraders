"use client";

import { LineChart } from "@/components/ui/lineChart";
import { formatMoney } from "@/lib/utils";

type Point = { day: string; revenue: number };

type Props = {
  data: Point[];
};

export function SalesChartClient({ data }: Props) {
  return (
    <LineChart
      data={data}
      index="day"
      categories={["revenue"]}
      colors={["magenta"]}
      valueFormatter={(v) => formatMoney(v)}
      showLegend={false}
      className="h-full [&_.recharts-cartesian-axis-tick-value]:text-xs"
      yAxisWidth={80}
    />
  );
}
