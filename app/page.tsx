import { AnomalyBanner } from "@/components/anomalyBanner";
import { KpiGrid } from "@/components/kpiGrid";
import { SalesChart } from "@/components/salesChart";
import { SyncStateCard } from "@/components/syncStateCard";
import { SyncStateTable } from "@/components/syncStateTable";
import { getAnomalies } from "@/lib/actions/anomalies";

export default async function Dashboard() {
  const anomalies = await getAnomalies();

  return (
    <main className="flex flex-col gap-6 p-6">
      <AnomalyBanner anomalies={anomalies} />
      <KpiGrid />
      <SalesChart />
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <SyncStateTable />
        </div>
        <SyncStateCard />
      </div>
    </main>
  );
}
