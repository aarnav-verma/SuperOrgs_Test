"use client";

import { BreakdownBarChart } from "@/components/bi/BreakdownBarChart";
import { CotsProductTable } from "@/components/bi/CotsProductTable";
import { ExecutiveBriefingCard } from "@/components/bi/ExecutiveBriefingCard";
import { FollowupChips } from "@/components/bi/FollowupChips";
import { GovernanceRiskTable } from "@/components/bi/GovernanceRiskTable";
import { KpiCardGrid } from "@/components/bi/KpiCardGrid";
import { QuadrantMatrix } from "@/components/bi/QuadrantMatrix";
import { SavingsOpportunitiesTable } from "@/components/bi/SavingsOpportunitiesTable";
import { TrendLineChart } from "@/components/bi/TrendLineChart";
import { UseCaseSearchTable } from "@/components/bi/UseCaseSearchTable";
import { BiComponentFrame } from "@/components/bi/BiComponentFrame";
import {
  type AdoptionGovernanceMatrixResult,
  type CotsAdoptionResult,
  type CostIntelligenceResult,
  type FollowupSuggestionsResult,
  type InventoryBreakdownResult,
  type MissionControlSnapshot,
  type RiskCommandCenterResult,
  type UseCaseSearchResult
} from "@/lib/analytics/types";

type ToolResultPayload =
  | MissionControlSnapshot
  | InventoryBreakdownResult
  | RiskCommandCenterResult
  | CotsAdoptionResult
  | CostIntelligenceResult
  | UseCaseSearchResult
  | AdoptionGovernanceMatrixResult
  | FollowupSuggestionsResult;

type ToolRendererProps = {
  result?: unknown;
  loading?: boolean;
  error?: string | null;
  onFollowupSelect?: (prompt: string) => void;
};

export function ToolRenderer({
  error,
  loading,
  onFollowupSelect,
  result
}: ToolRendererProps) {
  if (loading) {
    return <BiComponentFrame title="Loading analysis" loading />;
  }

  if (error) {
    return (
      <BiComponentFrame
        title="Tool result unavailable"
        error={error}
        emptyMessage="This analysis could not be rendered."
      />
    );
  }

  const payloads = normalizeToolPayloads(result);

  if (payloads.length === 0) {
    return (
      <BiComponentFrame
        title="No tool output"
        empty
        emptyMessage="No rendered BI result is available for this message."
      />
    );
  }

  return (
    <div className="space-y-3">
      {payloads.map((payload, index) => (
        <RenderedToolPayload
          key={`${payload.componentType}-${index}`}
          onFollowupSelect={onFollowupSelect}
          payload={payload}
        />
      ))}
    </div>
  );
}

function RenderedToolPayload({
  onFollowupSelect,
  payload
}: {
  onFollowupSelect?: (prompt: string) => void;
  payload: ToolResultPayload;
}) {
  switch (payload.componentType) {
    case "mission_control":
      return (
        <div className="space-y-3">
          <ExecutiveBriefingCard snapshot={payload} />
          <KpiCardGrid kpis={payload.kpis} />
          <div className="grid gap-3 xl:grid-cols-2">
            <BreakdownBarChart
              data={payload.compositionChart.data}
              title={payload.compositionChart.title}
            />
            <BreakdownBarChart data={payload.riskChart.data} title={payload.riskChart.title} />
          </div>
        </div>
      );

    case "breakdown":
      return <BreakdownBarChart result={payload} />;

    case "risk_command_center":
      return (
        <div className="space-y-3">
          <KpiCardGrid kpis={payload.kpis} />
          <GovernanceRiskTable result={payload} />
        </div>
      );

    case "cots_adoption":
      return (
        <div className="space-y-3">
          <KpiCardGrid kpis={payload.kpis} />
          {payload.data.length > 0 ? (
            <BreakdownBarChart data={payload.data} subtitle={payload.subtitle ?? payload.note} title={payload.title} />
          ) : null}
          <CotsProductTable result={payload} />
        </div>
      );

    case "cost_intelligence":
      return (
        <div className="space-y-3">
          <KpiCardGrid kpis={payload.kpis} />
          {payload.data.length > 0 && payload.chartType === "line" ? (
            <TrendLineChart result={payload} />
          ) : null}
          {payload.data.length > 0 && payload.chartType === "bar" ? (
            <BreakdownBarChart
              data={payload.data}
              subtitle={payload.subtitle ?? payload.disclosure}
              syntheticMetric
              title={payload.title}
            />
          ) : null}
          {payload.rows.length > 0 ? <SavingsOpportunitiesTable result={payload} /> : null}
        </div>
      );

    case "use_case_search":
      return <UseCaseSearchTable onPrompt={onFollowupSelect} result={payload} />;

    case "adoption_governance_matrix":
      return <QuadrantMatrix result={payload} />;

    case "followup_suggestions":
      return <FollowupChips onSelect={onFollowupSelect} result={payload} />;

    default:
      return (
        <BiComponentFrame
          title="Unsupported tool output"
          empty
          emptyMessage="This tool result type is not supported by the chat renderer yet."
        />
      );
  }
}

function normalizeToolPayloads(result: unknown): ToolResultPayload[] {
  if (!result) {
    return [];
  }

  if (Array.isArray(result)) {
    return result.filter(isToolResultPayload);
  }

  if (isToolResultPayload(result)) {
    return [result];
  }

  if (isRecord(result)) {
    if (Array.isArray(result.results)) {
      return result.results.filter(isToolResultPayload);
    }

    if (Array.isArray(result.toolResults)) {
      return result.toolResults.filter(isToolResultPayload);
    }

    if (isToolResultPayload(result.result)) {
      return [result.result];
    }

    if (isToolResultPayload(result.output)) {
      return [result.output];
    }
  }

  return [];
}

function isToolResultPayload(value: unknown): value is ToolResultPayload {
  if (!isRecord(value) || typeof value.componentType !== "string") {
    return false;
  }

  return [
    "mission_control",
    "breakdown",
    "risk_command_center",
    "cots_adoption",
    "cost_intelligence",
    "use_case_search",
    "adoption_governance_matrix",
    "followup_suggestions"
  ].includes(value.componentType);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
