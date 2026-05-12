import type { CostIntelligenceResult, SavingsOpportunityRow } from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { BiComponentFrame } from "./BiComponentFrame";

type SavingsOpportunitiesTableProps = {
  result?: Pick<CostIntelligenceResult, "title" | "subtitle" | "rows" | "disclosure">;
  rows?: SavingsOpportunityRow[];
  loading?: boolean;
  error?: string | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCurrencyWithCents(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: value > 0 && value < 10 ? 2 : 0
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function reportedText(value: string | null) {
  return value && value.trim().length > 0 ? value : "Not reported";
}

export function SavingsOpportunitiesTable({
  result,
  rows,
  loading,
  error
}: SavingsOpportunitiesTableProps) {
  const tableRows = result?.rows ?? rows ?? [];

  return (
    <BiComponentFrame
      title={result?.title ?? "Savings Opportunity Review"}
      subtitle={
        result?.subtitle ??
        result?.disclosure ??
        "Synthetic cost, utilization, and governance estimates for spend optimization."
      }
      syntheticMetric
      loading={loading}
      error={error}
      empty={tableRows.length === 0}
      emptyMessage="No high-cost or low-utilization systems are flagged for this view. Try broadening filters or switching to all agencies."
    >
      <div className="max-h-[520px] overflow-auto rounded-md border border-[var(--border)]">
        <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">System</th>
              <th className="px-3 py-2 font-medium">Agency</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Classification</th>
              <th className="px-3 py-2 font-medium">Monthly cost estimate</th>
              <th className="px-3 py-2 font-medium">Utilization score</th>
              <th className="px-3 py-2 font-medium">Cost per task</th>
              <th className="px-3 py-2 font-medium">Governance score</th>
              <th className="px-3 py-2 font-medium">Why flagged</th>
              <th className="px-3 py-2 font-medium">Estimated monthly savings</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr className="border-t border-[var(--border)] align-top" key={`${row.agency}-${row.useCaseName}`}>
                <td className="max-w-[260px] truncate px-3 py-2 font-medium" title={row.useCaseName}>
                  {row.useCaseName}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2" title={row.agency}>
                  {row.agency}
                </td>
                <td className="px-3 py-2">{reportedText(row.stage)}</td>
                <td className="max-w-[160px] truncate px-3 py-2" title={reportedText(row.classification)}>
                  {reportedText(row.classification)}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{formatCurrency(row.estimatedMonthlyCost)}</div>
                  <div className="mt-1 text-[var(--muted)]">{formatNumber(row.taskVolume)} tasks</div>
                </td>
                <td className="px-3 py-2 font-medium tabular-nums">{row.utilizationScore}</td>
                <td className="px-3 py-2">{formatCurrencyWithCents(row.costPerTask)}</td>
                <td className="px-3 py-2 font-medium tabular-nums">{row.governanceScore}</td>
                <td className="max-w-[260px] px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {row.opportunity.split(";").map((reason) => (
                      <Badge className="max-w-[220px] truncate" key={reason.trim()} title={reason.trim()} tone="warning">
                        {reason.trim()}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(row.estimatedMonthlySavings)}</span>
                    <Badge tone="warning">Synthetic</Badge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BiComponentFrame>
  );
}
