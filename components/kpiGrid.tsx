import { DollarSign, Receipt, Undo2, UserCheck } from "lucide-react";

import { KpiCard } from "@/components/kpiCard";
import { getKpis } from "@/lib/actions/kpis";
import { type DateRange } from "@/lib/actions/_shared";
import { formatMoney, formatNumber, formatPercent } from "@/lib/utils";

type Props = {
  range?: DateRange;
};

export async function KpiGrid({ range = "all" }: Props) {
  const kpis = await getKpis(range);

  return (
    <div className="grid grid-cols-4 gap-4">
      <KpiCard
        label="Gross Revenue"
        value={formatMoney(kpis.totalRevenue)}
        progress={kpis.totalRevenue}
        accent="positive"
        icon={DollarSign}
      />
      <KpiCard
        label="Avg Order Value"
        value={formatMoney(kpis.averageOrderValue)}
        progress={kpis.averageOrderValue}
        accent="positive"
        icon={Receipt}
      />
      <KpiCard
        label="Return Rate"
        value={formatPercent(kpis.returnRate)}
        progress={kpis.returnRate}
        accent="negative"
        icon={Undo2}
      />
      <KpiCard
        label="Active Customers"
        value={formatNumber(kpis.totalCustomers)}
        progress={kpis.totalCustomers}
        accent="positive"
        icon={UserCheck}
      />
    </div>
  );
}
