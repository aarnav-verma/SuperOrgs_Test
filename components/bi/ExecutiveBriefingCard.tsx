import type { MissionControlSnapshot } from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { BiComponentFrame } from "./BiComponentFrame";
import { DatasetDisclosureBadge } from "./DatasetDisclosureBadge";

type ExecutiveBriefingCardProps = {
  snapshot?: MissionControlSnapshot;
  loading?: boolean;
  error?: string | null;
};

function BriefingSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-[var(--border)] bg-white px-3 py-3">
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{title}</h4>
      <ul className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li className="flex gap-2 text-sm leading-6 text-[var(--foreground)]" key={item}>
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--panel)] text-[10px] font-semibold text-[var(--muted)]">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ExecutiveBriefingCard({
  snapshot,
  loading,
  error
}: ExecutiveBriefingCardProps) {
  return (
    <BiComponentFrame
      title={snapshot?.title ?? "Executive briefing"}
      subtitle={snapshot?.subtitle ?? "Mission Control summary"}
      eyebrow="Mission Control"
      loading={loading}
      error={error}
      empty={!snapshot}
      emptyMessage="Run the Mission Control query to generate an executive briefing."
      syntheticMetric={snapshot?.syntheticMetric}
    >
      {snapshot && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm leading-6 text-[var(--foreground)]">
                This briefing summarizes the federal AI portfolio using reported OMB inventory
                records, then layers synthetic operating telemetry where the product needs cost,
                utilization, or trend context.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Badge>Real OMB inventory</Badge>
              <DatasetDisclosureBadge label="Synthetic telemetry clearly labeled" synthetic />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <BriefingSection title="Key findings" items={snapshot.findings.slice(0, 3)} />
            <BriefingSection title="Top risks" items={snapshot.risks.slice(0, 3)} />
            <BriefingSection title="Recommended actions" items={snapshot.recommendedActions.slice(0, 3)} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                Dataset note
              </p>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                The AI inventory and COTS records are real public OMB 2025 records. They are best
                treated as a portfolio visibility baseline, not a complete operational telemetry
                system.
              </p>
            </div>

            {snapshot.disclosure && (
              <div className="rounded-md border border-[var(--warning-border)] bg-[var(--warning-soft)] px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--warning)]">
                  Synthetic telemetry note
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--warning)]">{snapshot.disclosure}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </BiComponentFrame>
  );
}
