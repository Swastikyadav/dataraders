import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Accent = "positive" | "negative";

type KpiCardProps = {
  label: string;
  value: string;
  trend?: number;
  progress?: number;
  accent?: Accent;
  icon?: LucideIcon;
};

export function KpiCard({
  label,
  value,
  trend,
  progress,
  accent = "positive",
  icon: Icon,
}: KpiCardProps) {
  const isNegative = accent === "negative";
  const trendColor = isNegative ? "text-accent-magenta" : "text-positive";
  const barColor = isNegative ? "bg-accent-magenta" : "bg-primary";
  const progressWidth =
    progress === undefined
      ? undefined
      : `${Math.max(0, Math.min(1, progress)) * 100}%`;

  return (
    <div className="rounded-sm border border-outline-variant bg-surface-container-lowest p-4">
      <div className="mb-2 flex items-start justify-between">
        <span className="text-label-sm font-bold uppercase tracking-widest text-outline">
          {label}
        </span>
        {trend !== undefined ? (
          <span className={cn("font-mono text-xs font-bold", trendColor)}>
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}%
          </span>
        ) : Icon ? (
          <Icon className="h-4 w-4 text-accent-magenta" strokeWidth={1.75} />
        ) : null}
      </div>
      <div className="font-mono text-2xl font-medium tracking-tighter text-primary">
        {value}
      </div>
      {progressWidth !== undefined && (
        <div className="mt-4 h-1 w-full overflow-hidden bg-surface-container-low">
          <div
            className={cn("h-full", barColor)}
            style={{ width: progressWidth }}
          />
        </div>
      )}
    </div>
  );
}
