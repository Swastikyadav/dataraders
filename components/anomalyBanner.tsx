"use client";

import { useState } from "react";
import Link from "next/link";
import { TriangleAlert, X } from "lucide-react";

import type { Anomaly } from "@/lib/actions/anomalies";

type Props = {
  anomalies: Anomaly[];
};

export function AnomalyBanner({ anomalies }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = anomalies.filter((a) => !dismissed.has(a.id));

  if (visible.length === 0) return null;

  const top = visible[0];
  const remaining = visible.length - 1;
  const investigateHref = `/orders?sku=${encodeURIComponent(top.sku)}&status=refunded`;

  const dismiss = () =>
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(top.id);
      return next;
    });

  return (
    <div className="flex items-center justify-between rounded-sm bg-accent-magenta px-4 py-3 text-on-primary">
      <div className="flex items-center gap-3">
        <TriangleAlert className="h-5 w-5 shrink-0" strokeWidth={2} />
        <span className="font-medium tracking-tight">
          {top.message}
          {remaining > 0 && (
            <span className="ml-2 text-on-primary/70">
              · +{remaining} more
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href={investigateHref}
          className="border-b border-on-primary text-xs font-bold uppercase tracking-widest transition-opacity duration-50 ease-technical hover:opacity-80"
        >
          Investigate
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss alert"
          className="cursor-pointer transition-opacity duration-50 ease-technical hover:opacity-80"
        >
          <X className="h-5 w-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
