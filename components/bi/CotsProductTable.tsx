import type { CotsAdoptionResult, CotsAdoptionRow } from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { BiComponentFrame } from "./BiComponentFrame";

type CotsProductTableProps = {
  result?: Pick<CotsAdoptionResult, "title" | "subtitle" | "rows" | "note">;
  rows?: CotsAdoptionRow[];
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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function compactLabel(value: string | null | undefined, fallback = "Not reported") {
  return value && value.trim().length > 0 ? value : fallback;
}

function ProductBadges({ row }: { row: CotsAdoptionRow }) {
  const products = row.product ? [row.product] : row.products ?? [];

  if (products.length === 0) {
    return <Badge tone="warning">Not reported</Badge>;
  }

  return (
    <div className="flex max-w-[260px] flex-wrap gap-1">
      {products.slice(0, 3).map((product) => (
        <Badge className="max-w-[220px] truncate" key={product} title={product}>
          {product}
        </Badge>
      ))}
      {products.length > 3 && <Badge>+{products.length - 3}</Badge>}
    </div>
  );
}

export function CotsProductTable({ result, rows, loading, error }: CotsProductTableProps) {
  const tableRows = result?.rows ?? rows ?? [];

  return (
    <BiComponentFrame
      title={result?.title ?? "COTS AI Adoption"}
      subtitle={result?.subtitle ?? result?.note ?? "Commercial AI product and use-case exposure from the COTS inventory."}
      syntheticMetric
      loading={loading}
      error={error}
      empty={tableRows.length === 0}
      emptyMessage="No COTS adoption rows are available. Seed the consolidated COTS inventory or broaden the agency filter."
    >
      <div className="max-h-[480px] overflow-auto rounded-md border border-[var(--border)]">
        <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Agency</th>
              <th className="px-3 py-2 font-medium">COTS use case</th>
              <th className="px-3 py-2 font-medium">Agency use</th>
              <th className="px-3 py-2 font-medium">Products</th>
              <th className="px-3 py-2 font-medium">License bucket</th>
              <th className="px-3 py-2 font-medium">Estimated license midpoint</th>
              <th className="px-3 py-2 font-medium">Estimated monthly spend</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr className="border-t border-[var(--border)] align-top" key={`${row.label}-${row.product ?? row.useCase ?? ""}`}>
                <td className="max-w-[220px] px-3 py-2">
                  <div className="truncate font-medium text-[var(--foreground)]" title={row.agency ?? row.label}>
                    {compactLabel(row.agency, row.label)}
                  </div>
                  {row.agencies > 1 && (
                    <div className="mt-1 text-[var(--muted)]">{formatNumber(row.agencies)} agencies</div>
                  )}
                </td>
                <td className="max-w-[240px] px-3 py-2">
                  <div className="truncate" title={row.useCase ?? undefined}>
                    {compactLabel(row.useCase, "Multiple COTS use cases")}
                  </div>
                  <div className="mt-1 text-[var(--muted)]">{formatNumber(row.systems)} reported rows</div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={row.yesRows > 0 ? "success" : "neutral"}>
                    {compactLabel(row.agencyUse, "Not reported")}
                  </Badge>
                </td>
                <td className="px-3 py-2">
                  <ProductBadges row={row} />
                  {row.uniqueProducts > 0 && (
                    <div className="mt-1 text-[var(--muted)]">
                      {formatNumber(row.uniqueProducts)} unique products
                    </div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.licenseBucket ? <Badge>{row.licenseBucket}</Badge> : <Badge tone="warning">Not reported</Badge>}
                </td>
                <td className="px-3 py-2">{formatNumber(row.estimatedLicenseExposure)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{formatCurrency(row.estimatedMonthlySpend)}</span>
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
