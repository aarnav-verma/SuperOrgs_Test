"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { ChartDatum, InventoryBreakdownResult } from "@/lib/analytics/types";

import { BiComponentFrame } from "./BiComponentFrame";

type BreakdownBarChartProps = {
  result?: Pick<InventoryBreakdownResult, "title" | "subtitle" | "data" | "rows">;
  title?: string;
  subtitle?: string;
  data?: ChartDatum[];
  syntheticMetric?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
};

const tooltipStyle = {
  border: "1px solid var(--border)",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(20, 24, 20, 0.08)",
  fontSize: 12
};

export function BreakdownBarChart({
  result,
  title,
  subtitle,
  data,
  syntheticMetric,
  loading,
  error,
  emptyMessage = "No breakdown data available."
}: BreakdownBarChartProps) {
  const chartData = result?.data ?? data ?? [];
  const tableRows = result?.rows ?? [];
  const hasAnyValue = chartData.length > 0;

  return (
    <BiComponentFrame
      title={result?.title ?? title ?? "Breakdown"}
      subtitle={result?.subtitle ?? subtitle}
      syntheticMetric={syntheticMetric}
      loading={loading}
      error={error}
      empty={chartData.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="space-y-4">
        <div className="h-72 min-w-0">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 18, bottom: 4, left: 16 }}>
              <CartesianGrid horizontal={false} stroke="var(--border)" />
              <XAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                type="number"
                tickFormatter={(value: number) => value.toLocaleString()}
                label={
                  hasAnyValue
                    ? {
                        value: "Systems",
                        position: "insideBottom",
                        fill: "var(--muted)",
                        offset: 8,
                        fontSize: 11
                      }
                    : undefined
                }
              />
              <YAxis
                axisLine={false}
                dataKey="label"
                tick={{ fill: "var(--muted)", fontSize: 11 }}
                tickLine={false}
                type="category"
                width={150}
                interval={0}
                tickFormatter={(value) => String(value)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(49, 95, 70, 0.06)" }}
                formatter={(value) => [Number(value).toLocaleString(), "Systems"]}
              />
              <Bar dataKey="value" fill="var(--accent)" maxBarSize={24} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {tableRows.length > 0 && (
          <div className="max-h-72 overflow-auto rounded-md border border-[var(--border)]">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-[var(--panel)] text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Segment</th>
                  <th className="px-3 py-2 font-medium">Systems</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2 font-medium">High-impact</th>
                  <th className="px-3 py-2 font-medium">PII</th>
                  <th className="px-3 py-2 font-medium">ATO coverage</th>
                  <th className="px-3 py-2 font-medium">Risk</th>
                  <th className="px-3 py-2 font-medium">Governance</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr className="border-t border-[var(--border)]" key={row.label}>
                    <td className="max-w-[260px] truncate px-3 py-2 font-medium">{row.label}</td>
                    <td className="px-3 py-2">{row.systems}</td>
                    <td className="px-3 py-2">{row.activeSystems}</td>
                    <td className="px-3 py-2">{row.highImpactSystems}</td>
                    <td className="px-3 py-2">{row.piiSystems}</td>
                    <td className="px-3 py-2">{row.atoCoverageRate}%</td>
                    <td className="px-3 py-2">{row.averageRiskScore}</td>
                    <td className="px-3 py-2">{row.averageGovernanceScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </BiComponentFrame>
  );
}
