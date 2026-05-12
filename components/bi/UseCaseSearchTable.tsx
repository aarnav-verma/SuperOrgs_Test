"use client";

import type { UseCaseSearchResult, UseCaseSearchRow } from "@/lib/analytics/types";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BiComponentFrame } from "./BiComponentFrame";

type UseCaseSearchTableProps = {
  result?: Pick<UseCaseSearchResult, "title" | "subtitle" | "rows">;
  rows?: UseCaseSearchRow[];
  loading?: boolean;
  error?: string | null;
  onPrompt?: (prompt: string) => void;
};

function boolBadge(value: boolean | null, label = "Yes") {
  if (value === true) {
    return <Badge tone="success">{label}</Badge>;
  }

  if (value === false) {
    return <Badge>No</Badge>;
  }

  return <Badge tone="warning">Not reported</Badge>;
}

function reportedText(value: string | null, fallback = "Not reported") {
  return value && value.trim().length > 0 ? value : fallback;
}

function shortSnippet(snippet: string) {
  return snippet.length > 230 ? `${snippet.slice(0, 227).trim()}...` : snippet;
}

function SnippetCell({ snippet }: { snippet: string }) {
  if (snippet.length <= 230) {
    return <p className="leading-5 text-[var(--foreground)]">{snippet}</p>;
  }

  return (
    <details>
      <summary className="cursor-pointer list-none">
        <span className="line-clamp-3 leading-5 text-[var(--foreground)]">
          {shortSnippet(snippet)}
        </span>
        <span className="mt-1 inline-flex text-[11px] font-medium text-[var(--accent)]">
          Expand snippet
        </span>
      </summary>
      <p className="mt-2 leading-5 text-[var(--muted)]">{snippet}</p>
    </details>
  );
}

export function UseCaseSearchTable({
  result,
  rows,
  loading,
  error,
  onPrompt
}: UseCaseSearchTableProps) {
  const tableRows = result?.rows ?? rows ?? [];

  return (
    <BiComponentFrame
      title={result?.title ?? "Use case search"}
      subtitle={
        result?.subtitle ??
        "Ranked inventory results across system descriptions, agencies, bureaus, topics, and AI classifications."
      }
      loading={loading}
      error={error}
      empty={tableRows.length === 0}
      emptyMessage="No AI use cases match this search."
    >
      <div className="max-h-[560px] overflow-auto rounded-md border border-[var(--border)]">
        <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-[var(--panel)] text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">System</th>
              <th className="px-3 py-2 font-medium">Agency</th>
              <th className="px-3 py-2 font-medium">Bureau</th>
              <th className="px-3 py-2 font-medium">Stage</th>
              <th className="px-3 py-2 font-medium">Classification</th>
              <th className="px-3 py-2 font-medium">Topic</th>
              <th className="px-3 py-2 font-medium">High-impact</th>
              <th className="px-3 py-2 font-medium">PII</th>
              <th className="px-3 py-2 font-medium">ATO</th>
              <th className="px-3 py-2 font-medium">Snippet</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr className="border-t border-[var(--border)] align-top" key={`${row.agency}-${row.useCaseName}`}>
                <td className="max-w-[260px] px-3 py-2">
                  <div className="truncate font-medium" title={row.useCaseName}>
                    {row.useCaseName}
                  </div>
                  {onPrompt && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button
                        className="h-7 px-2 text-[11px]"
                        onClick={() => onPrompt(`Analyze this system: ${row.useCaseName}`)}
                        size="sm"
                        variant="ghost"
                      >
                        Analyze this system
                      </Button>
                      <Button
                        className="h-7 px-2 text-[11px]"
                        onClick={() => onPrompt(`Show agency risk for ${row.agency}`)}
                        size="sm"
                        variant="ghost"
                      >
                        Show agency risk
                      </Button>
                      <Button
                        className="h-7 px-2 text-[11px]"
                        onClick={() =>
                          onPrompt(
                            `Find similar systems to ${row.useCaseName}${
                              row.classification ? ` in ${row.classification}` : ""
                            }`
                          )
                        }
                        size="sm"
                        variant="ghost"
                      >
                        Find similar systems
                      </Button>
                    </div>
                  )}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2" title={row.agency}>
                  {row.agency}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2" title={reportedText(row.bureau)}>
                  {reportedText(row.bureau)}
                </td>
                <td className="px-3 py-2">{reportedText(row.stage, "Unknown")}</td>
                <td className="max-w-[160px] truncate px-3 py-2" title={reportedText(row.classification, "Unknown")}>
                  {reportedText(row.classification, "Unknown")}
                </td>
                <td className="max-w-[160px] truncate px-3 py-2" title={reportedText(row.topic, "Unknown")}>
                  {reportedText(row.topic, "Unknown")}
                </td>
                <td className="px-3 py-2">{boolBadge(row.highImpact, "High-impact")}</td>
                <td className="px-3 py-2">{boolBadge(row.pii)}</td>
                <td className="px-3 py-2">{boolBadge(row.ato)}</td>
                <td className="max-w-[360px] px-3 py-2">
                  <SnippetCell snippet={row.snippet} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BiComponentFrame>
  );
}
