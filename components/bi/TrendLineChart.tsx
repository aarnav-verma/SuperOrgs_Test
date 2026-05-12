"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import type { ChartDatum, CostIntelligenceResult } from "@/lib/analytics/types";

import { BiComponentFrame } from "./BiComponentFrame";

type TrendLineChartProps = {
  result?: Pick<CostIntelligenceResult, "title" | "subtitle" | "data" | "syntheticMetric" | "disclosure">;
  title?: string;
  subtitle?: string;
  data?: ChartDatum[];
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

function formatAxisValue(value: number) {
  if (Math.abs(value) >= 1000000) {
    return `${Math.round(value / 1000000)}M`;
  }

  if (Math.abs(value) >= 1000) {
    return `${Math.round(value / 1000)}K`;
  }

  return String(value);
}

export function TrendLineChart({
  result,
  title,
  subtitle,
  data,
  loading,
  error,
  emptyMessage = "No trend data available."
}: TrendLineChartProps) {
  const chartData = result?.data ?? data ?? [];
  const valueFormatter = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }

    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value);
  };

  return (
    <BiComponentFrame
      title={result?.title ?? title ?? "Trend"}
      subtitle={subtitle ?? result?.subtitle ?? result?.disclosure}
      syntheticMetric={result?.syntheticMetric}
      loading={loading}
      error={error}
      empty={chartData.length === 0}
      emptyMessage={emptyMessage}
    >
      <div className="h-72 min-w-0">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 18, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickLine={false}
              label={{
                value: "Month",
                position: "insideBottom",
                offset: -2,
                fill: "var(--muted)",
                fontSize: 11
              }}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: "var(--muted)", fontSize: 11 }}
              tickFormatter={formatAxisValue}
              tickLine={false}
              width={44}
              label={{
                value: "Monthly est.",
                angle: -90,
                position: "insideLeft",
                fill: "var(--muted)",
                fontSize: 11
              }}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => [valueFormatter(Number(value)), "Monthly estimate"]}
            />
            <Line
              activeDot={{ r: 4, stroke: "var(--accent)", strokeWidth: 2 }}
              dataKey="value"
              dot={false}
              stroke="var(--accent)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </BiComponentFrame>
  );
}
