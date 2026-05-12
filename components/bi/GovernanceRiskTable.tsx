import type { GovernanceRiskRow, RiskCommandCenterResult } from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { BiComponentFrame } from "./BiComponentFrame";

type GovernanceRiskTableProps = {
  result?: Pick<RiskCommandCenterResult, "title" | "subtitle" | "rows">;
  rows?: GovernanceRiskRow[];
  loading?: boolean;
  error?: string | null;
};

function riskTierTone(tier: string) {
  if (tier === "Critical") {
    return "strong" as const;
  }

  if (tier === "High") {
    return "warning" as const;
  }

  if (tier === "Low") {
    return "success" as const;
  }

  return "neutral" as const;
}

function riskTierClass(tier: string) {
  if (tier === "Critical") {
    return "border-[var(--warning-border)] bg-[var(--warning)] text-white";
  }

  if (tier === "High") {
    return "border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning)]";
  }

  return undefined;
}

function piiBadge(value: boolean | null) {
  if (value === true) {
    return <Badge tone="warning">Yes</Badge>;
  }

  if (value === false) {
    return <Badge>No</Badge>;
  }

  return <Badge tone="warning">Not reported</Badge>;
}

function atoBadge(value: boolean | null) {
  if (value === true) {
    return <Badge tone="success">Reported</Badge>;
  }

  if (value === false) {
    return <Badge tone="warning">Needs review</Badge>;
  }

  return <Badge tone="warning">Not reported</Badge>;
}

function badgeToneFor(item: string) {
  const normalized = item.toLowerCase();

  if (normalized.includes("missing") || normalized.includes("unknown") || normalized.includes("not reported")) {
    return "warning" as const;
  }

  if (normalized.includes("pii") || normalized.includes("high-impact")) {
    return "warning" as const;
  }

  return "neutral" as const;
}

function BadgeList({
  emptyLabel,
  items,
  prefix
}: {
  emptyLabel: string;
  items: string[];
  prefix?: string;
}) {
  if (items.length === 0) {
    return <span className="text-[var(--muted)]">{emptyLabel}</span>;
  }

  return (
    <div className="flex max-w-[280px] flex-wrap gap-1">
      {items.slice(0, 4).map((item) => (
        <Badge className="max-w-[260px] truncate" key={item} title={item} tone={badgeToneFor(item)}>
          {prefix ? `${prefix}: ${item}` : item}
        </Badge>
      ))}
      {items.length > 4 && <Badge>+{items.length - 4}</Badge>}
    </div>
  );
}

function reportedText(value: string | null) {
  return value && value.trim().length > 0 ? value : "Not reported";
}

export function GovernanceRiskTable({
  result,
  rows,
  loading,
  error
}: GovernanceRiskTableProps) {
  const tableRows = result?.rows ?? rows ?? [];

  return (
    <BiComponentFrame
      title={result?.title ?? "Governance Risk Command Center"}
      subtitle={
        result?.subtitle ??
        "App-derived prioritization scores for systems needing review. Blank governance fields are shown as Not reported."
      }
      loading={loading}
      error={error}
      empty={tableRows.length === 0}
      emptyMessage="No systems match this governance risk view. Try broadening the filters or switching from deployed systems to all high-impact systems."
    >
      <div className="max-h-[520px] overflow-auto rounded-md border border-[var(--border)]">
        <table className="w-full min-w-[1240px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">System</th>
              <th className="px-3 py-2 font-medium">Agency</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Classification</th>
              <th className="px-3 py-2 font-medium">Topic</th>
              <th className="px-3 py-2 font-medium">PII</th>
              <th className="px-3 py-2 font-medium">ATO</th>
              <th className="px-3 py-2 font-medium">Risk tier</th>
              <th className="px-3 py-2 font-medium">Risk score</th>
              <th className="px-3 py-2 font-medium">Governance score</th>
              <th className="px-3 py-2 font-medium">Missing controls</th>
              <th className="px-3 py-2 font-medium">Risk drivers</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr className="border-t border-[var(--border)] align-top" key={`${row.agency}-${row.useCaseName}`}>
                <td className="max-w-[260px] px-3 py-2">
                  <div className="truncate font-medium text-[var(--foreground)]" title={row.useCaseName}>
                    {row.useCaseName}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {row.highImpact && <Badge tone="warning">High-impact</Badge>}
                    {row.missingControls.length > 0 && <Badge tone="warning">Needs review</Badge>}
                  </div>
                </td>
                <td className="max-w-[180px] truncate px-3 py-2" title={row.agency}>
                  {row.agency}
                </td>
                <td className="px-3 py-2">{reportedText(row.stage)}</td>
                <td className="max-w-[160px] truncate px-3 py-2" title={reportedText(row.classification)}>
                  {reportedText(row.classification)}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2" title={reportedText(row.topic)}>
                  {reportedText(row.topic)}
                </td>
                <td className="px-3 py-2">{piiBadge(row.pii)}</td>
                <td className="px-3 py-2">{atoBadge(row.ato)}</td>
                <td className="px-3 py-2">
                  <Badge className={riskTierClass(row.riskTier)} tone={riskTierTone(row.riskTier)}>
                    {reportedText(row.riskTier)}
                  </Badge>
                </td>
                <td className="px-3 py-2 font-semibold tabular-nums">{row.riskScore.toFixed(0)}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">
                  {row.governanceScore.toFixed(0)}
                </td>
                <td className="px-3 py-2">
                  <BadgeList
                    emptyLabel="No missing controls flagged"
                    items={row.missingControls}
                    prefix="Needs review"
                  />
                </td>
                <td className="px-3 py-2">
                  <BadgeList emptyLabel="No review drivers flagged" items={row.riskDrivers} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BiComponentFrame>
  );
}
