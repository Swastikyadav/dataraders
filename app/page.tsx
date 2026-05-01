import { AnomalyBanner } from "@/components/anomalyBanner";
import { KpiGrid } from "@/components/kpiGrid";
import { SalesChart } from "@/components/salesChart";
import { SyncStateCard } from "@/components/syncStateCard";
import { SyncStateTable } from "@/components/syncStateTable";
import { getAnomalies } from "@/lib/actions/anomalies";
import { type DateRange } from "@/lib/actions/_shared";

const VALID_RANGES: DateRange[] = ["7d", "28d", "90d", "all"];

function asDateRange(value: string | string[] | undefined): DateRange {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && (VALID_RANGES as string[]).includes(raw)
    ? (raw as DateRange)
    : "all";
}

type Props = {
  searchParams: Promise<{ range?: string | string[] }>;
};

export default async function Dashboard({ searchParams }: Props) {
  const params = await searchParams;
  const range = asDateRange(params.range);
  const anomalies = await getAnomalies();

  return (
    <main className="flex flex-col gap-6 p-6">
      <AnomalyBanner anomalies={anomalies} />
      <KpiGrid range={range} />
      <SalesChart range={range} />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <SyncStateTable />
        </div>
        <SyncStateCard />
      </div>
    </main>
  );
}
