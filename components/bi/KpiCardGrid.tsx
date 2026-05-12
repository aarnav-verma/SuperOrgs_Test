import type { BiKpi } from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

type KpiCardGridProps = {
  kpis?: BiKpi[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

function toneClass(tone?: BiKpi["tone"]) {
  switch (tone) {
    case "critical":
      return "border-[var(--warning-border)] bg-[var(--warning-soft)]";
    case "success":
      return "border-[var(--success-border)] bg-[var(--success-soft)]";
    case "warning":
      return "border-[var(--warning-border)]";
    case "neutral":
    default:
      return "";
  }
}

function gridClass(kpiCount: number) {
  if (kpiCount === 6) {
    return "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6";
  }

  if (kpiCount === 4) {
    return "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4";
  }

  return "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5";
}

export function KpiCardGrid({
  kpis = [],
  loading,
  error,
  emptyMessage = "No KPI data available."
}: KpiCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Card className="p-3" key={index}>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-3 h-7 w-1/2" />
            <Skeleton className="mt-3 h-3 w-4/5" />
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-xs text-[var(--warning)]">
        {error}
      </Card>
    );
  }

  if (kpis.length === 0) {
    return (
      <Card className="border-dashed p-4 text-center text-xs text-[var(--muted)]">
        {emptyMessage}
      </Card>
    );
  }

  return (
    <div className={gridClass(kpis.length)}>
      {kpis.map((kpi) => (
        <Card className={`min-w-0 p-3 ${toneClass(kpi.tone)}`} key={kpi.label}>
          <div className="flex min-h-5 items-start justify-between gap-2">
            <p className="line-clamp-2 text-xs font-medium leading-5 text-[var(--muted)]">
              {kpi.label}
            </p>
            {kpi.syntheticMetric && (
              <span className="shrink-0">
                <Badge tone="warning">Synthetic</Badge>
              </span>
            )}
          </div>
          <p className="mt-2 truncate text-2xl font-semibold tracking-normal text-[var(--foreground)]" title={String(kpi.value)}>
            {kpi.value}
          </p>
          {kpi.detail && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{kpi.detail}</p>}
        </Card>
      ))}
    </div>
  );
}
