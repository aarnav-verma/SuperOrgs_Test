import type {
  AdoptionGovernanceMatrixResult,
  AdoptionGovernanceMatrixRow
} from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { BiComponentFrame } from "./BiComponentFrame";

type QuadrantMatrixProps = {
  result?: AdoptionGovernanceMatrixResult;
  loading?: boolean;
  error?: string | null;
};

function clampPosition(value: number) {
  return Math.min(94, Math.max(6, value));
}

function quadrantTone(quadrant: string) {
  if (quadrant === "Scale Confidently") {
    return "success" as const;
  }

  if (quadrant === "Govern Before Scaling") {
    return "warning" as const;
  }

  if (quadrant === "Ready to Expand") {
    return "strong" as const;
  }

  return "neutral" as const;
}

function quadrantSummary(rows: AdoptionGovernanceMatrixRow[]) {
  const quadrants: AdoptionGovernanceMatrixRow["quadrant"][] = [
    "Govern Before Scaling",
    "Scale Confidently",
    "Ready to Expand",
    "Underdeveloped"
  ];

  return quadrants.map((quadrant) => ({
    quadrant,
    count: rows.filter((row) => row.quadrant === quadrant).length
  }));
}

function formatScore(value: number) {
  return value.toFixed(1).replace(".0", "");
}

function quadrantCopy(quadrant: AdoptionGovernanceMatrixRow["quadrant"]) {
  const copy: Record<AdoptionGovernanceMatrixRow["quadrant"], string> = {
    "Scale Confidently": "High adoption with stronger readiness signals",
    "Govern Before Scaling": "Adoption is ahead of governance readiness",
    "Ready to Expand": "Governance is stronger than current adoption",
    Underdeveloped: "Low adoption and low readiness signals"
  };

  return copy[quadrant];
}

export function QuadrantMatrix({ result, loading, error }: QuadrantMatrixProps) {
  const rows = result?.data ?? [];
  const summaries = quadrantSummary(rows);
  const priorityRows = rows.filter((row) => row.quadrant === "Govern Before Scaling");
  const headline =
    priorityRows.length > 0
      ? `${priorityRows.length} group${priorityRows.length === 1 ? "" : "s"} need governance before additional scaling.`
      : "No groups are currently in the Govern Before Scaling quadrant.";

  return (
    <BiComponentFrame
      title={result?.title ?? "Adoption Governance Matrix"}
      subtitle={
        result?.subtitle ??
        "Adoption score compared with governance readiness. Use this to decide where to scale, pause, or review governance capacity."
      }
      loading={loading}
      error={error}
      syntheticMetric={result?.syntheticMetric}
      empty={rows.length === 0}
      emptyMessage="No adoption governance matrix data available."
    >
      <div className="space-y-4">
        <div className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-[var(--foreground)]">{headline}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                X-axis is adoption; Y-axis is governance readiness. Higher and farther right is healthier for scaling decisions.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {summaries.map((summary) => (
                <Badge key={summary.quadrant} tone={quadrantTone(summary.quadrant)}>
                  {summary.count} {summary.quadrant}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-[420px] overflow-hidden rounded-md border border-[var(--border)] bg-[var(--panel)]">
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--border-strong)]" />
          <div className="absolute inset-y-0 left-1/2 border-l border-dashed border-[var(--border-strong)]" />

          <div className="absolute left-3 top-3 max-w-[190px]">
            <Badge tone="strong">Ready to Expand</Badge>
            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
              Governed capacity with room for adoption.
            </p>
          </div>
          <div className="absolute right-3 top-3 max-w-[190px] text-right">
            <Badge tone="success">Scale Confidently</Badge>
            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
              Stronger adoption and readiness signals.
            </p>
          </div>
          <div className="absolute bottom-3 left-3 max-w-[190px]">
            <Badge>Underdeveloped</Badge>
            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
              Low adoption and low readiness.
            </p>
          </div>
          <div className="absolute bottom-3 right-3 max-w-[190px] text-right">
            <Badge tone="warning">Govern Before Scaling</Badge>
            <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
              Adoption is ahead of readiness.
            </p>
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]">
            Adoption score increases right
          </div>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 -rotate-90 rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] font-medium text-[var(--muted)]">
            Governance readiness increases up
          </div>

          {rows.map((row) => (
            <div
              className={`absolute max-w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-[10px] shadow-sm ${
                row.quadrant === "Govern Before Scaling"
                  ? "border-[var(--warning-border)] bg-[var(--warning-soft)]"
                  : "border-[var(--border-strong)] bg-[var(--background)]"
              }`}
              key={row.label}
              style={{
                left: `${clampPosition(row.adoptionScore)}%`,
                top: `${100 - clampPosition(row.governanceScore)}%`
              }}
              title={`${row.label}: adoption ${row.adoptionScore}, governance ${row.governanceScore}, risk ${row.riskScore}`}
            >
              <div className="truncate font-semibold text-[var(--foreground)]">{row.label}</div>
              <div className="mt-0.5 flex items-center gap-2 text-[var(--muted)]">
                <span>A {formatScore(row.adoptionScore)}</span>
                <span>G {formatScore(row.governanceScore)}</span>
                <span>R {formatScore(row.riskScore)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="max-h-72 overflow-auto rounded-md border border-[var(--border)]">
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="sticky top-0 bg-[var(--panel)] text-[var(--muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Label</th>
                <th className="px-3 py-2 font-medium">Adoption score</th>
                <th className="px-3 py-2 font-medium">Governance score</th>
                <th className="px-3 py-2 font-medium">Active systems</th>
                <th className="px-3 py-2 font-medium">High-impact systems</th>
                <th className="px-3 py-2 font-medium">Average risk score</th>
                <th className="px-3 py-2 font-medium">Quadrant</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-[var(--border)]" key={row.label}>
                  <td className="max-w-[240px] truncate px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatScore(row.adoptionScore)}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatScore(row.governanceScore)}</td>
                  <td className="px-3 py-2 tabular-nums">{row.activeSystems}</td>
                  <td className="px-3 py-2 tabular-nums">{row.highImpactSystems}</td>
                  <td className="px-3 py-2 font-medium tabular-nums">{formatScore(row.riskScore)}</td>
                  <td className="px-3 py-2">
                    <div className="flex max-w-[260px] flex-col gap-1">
                      <Badge className="w-fit" tone={quadrantTone(row.quadrant)}>
                        {row.quadrant}
                      </Badge>
                      <span className="text-[11px] leading-4 text-[var(--muted)]">
                        {quadrantCopy(row.quadrant)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </BiComponentFrame>
  );
}
