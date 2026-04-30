import { AnomalyBanner } from "@/components/anomalyBanner";
import { KpiGrid } from "@/components/kpiGrid";
import { getAnomalies } from "@/lib/actions/anomalies";

export default async function Dashboard() {
  const anomalies = await getAnomalies();

  return (
    <main className="flex flex-col gap-6 p-6">
      <AnomalyBanner anomalies={anomalies} />
      <KpiGrid />
    </main>
  );
}
