import type { Prisma } from "@prisma/client";

import { prisma } from "../db/prisma";
import type {
  AdoptionGovernanceMatrixParams,
  AdoptionGovernanceMatrixResult,
  AdoptionGovernanceMatrixRow,
  BiKpi,
  CostIntelligenceParams,
  CostIntelligenceResult,
  CotsAdoptionParams,
  CotsAdoptionResult,
  CotsAdoptionRow,
  FollowupSuggestionsParams,
  FollowupSuggestionsResult,
  GovernanceRiskRow,
  InventoryBreakdownParams,
  InventoryBreakdownResult,
  InventoryBreakdownRow,
  MissionControlSnapshot,
  RiskCommandCenterParams,
  RiskCommandCenterResult,
  SavingsOpportunityRow,
  SearchUseCasesParams,
  UseCaseFilters,
  UseCaseSearchResult,
  UseCaseSearchRow
} from "./types";

const SYNTHETIC_DISCLOSURE =
  "Cost, usage, productivity, risk trend, and governance trend metrics are deterministic synthetic estimates derived from real OMB inventory attributes. They are not official OMB-reported telemetry.";

const DEFAULT_LIMIT = 10;

type AgencyRecord = {
  id: string;
  name: string;
  normalizedName: string;
  abbreviation?: string | null;
};

type GovernanceControlRecord = {
  riskTier: string;
  riskScore: number;
  governanceScore: number;
  missingControlsJson: unknown;
  riskDriversJson: unknown;
};

type MonthlyMetricRecord = {
  month: Date;
  estimatedMonthlyCost: number;
  estimatedActiveUsers: number;
  taskVolume: number;
  estimatedHoursSaved: number;
  estimatedValueCreated: number;
  riskScore: number;
  governanceScore: number;
  utilizationScore: number;
  adoptionScore: number;
};

type UseCaseRecord = {
  id: string;
  useCaseName: string;
  agencyBureau: string | null;
  normalizedStage: string | null;
  activeSystemBoolean: boolean;
  highImpactBoolean: boolean;
  isHighImpact?: string | null;
  highImpactJustification?: string | null;
  normalizedTopicArea: string | null;
  topicArea?: string | null;
  normalizedClassification: string | null;
  classification?: string | null;
  problemSolved: string | null;
  benefits: string | null;
  systemOutputs: string | null;
  hasPii?: string | null;
  piiBoolean: boolean | null;
  atoBoolean: boolean | null;
  agency: AgencyRecord;
  governanceControl: GovernanceControlRecord | null;
  monthlyMetrics: MonthlyMetricRecord[];
};

type CotsRecord = {
  id: string;
  aiUseCase: string;
  agencyUse: string | null;
  agencyUseBoolean: boolean | null;
  productText: string | null;
  productNamesJson: unknown;
  licenseBucket: string | null;
  estimatedLicenseMidpoint: number | null;
  estimatedMonthlySpend: number | null;
  agency: AgencyRecord;
};

type Aggregate = {
  label: string;
  systems: number;
  activeSystems: number;
  highImpactSystems: number;
  piiSystems: number;
  atoSystems: number;
  riskScoreTotal: number;
  governanceScoreTotal: number;
  scoreCount: number;
};

function clampLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.min(100, Math.max(1, Math.floor(limit)));
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values: number[]) {
  return values.length > 0 ? sum(values) / values.length : 0;
}

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

function formatPercent(value: number) {
  return `${round(value, 1)}%`;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string | number | boolean => item != null)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function isPlaceholderValue(value: string | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  return normalized === "all" || normalized === "any" || normalized === "none" || normalized === "*" || normalized === "";
}

function buildUseCaseWhere(filters?: UseCaseFilters): Prisma.AiUseCaseWhereInput {
  const where: Prisma.AiUseCaseWhereInput = {};

  if (!filters) {
    return where;
  }

  if (filters.agency && !isPlaceholderValue(filters.agency)) {
    where.agency = {
      OR: [
        {
          name: {
            contains: filters.agency,
            mode: "insensitive"
          }
        },
        {
          normalizedName: {
            contains: filters.agency,
            mode: "insensitive"
          }
        },
        {
          abbreviation: {
            contains: filters.agency,
            mode: "insensitive"
          }
        }
      ]
    };
  }

  if (filters.stage && !isPlaceholderValue(filters.stage)) {
    where.normalizedStage = {
      contains: filters.stage,
      mode: "insensitive"
    };
  }

  if (filters.topic && !isPlaceholderValue(filters.topic)) {
    where.normalizedTopicArea = {
      contains: filters.topic,
      mode: "insensitive"
    };
  }

  if (filters.classification && !isPlaceholderValue(filters.classification)) {
    where.normalizedClassification = {
      contains: filters.classification,
      mode: "insensitive"
    };
  }

  if (filters.highImpactOnly) {
    where.highImpactBoolean = true;
  }

  if (filters.piiOnly) {
    where.piiBoolean = true;
  }

  if (filters.deployedOnly) {
    where.normalizedStage = "Deployed";
  }

  return where;
}

function buildCotsWhere(params?: Pick<CotsAdoptionParams, "agency">): Prisma.CotsUseCaseWhereInput {
  if (!params?.agency || isPlaceholderValue(params.agency)) {
    return {};
  }

  return {
    agency: {
      name: {
        contains: params.agency,
        mode: "insensitive"
      }
    }
  };
}

async function getLatestMetricMonth() {
  const latestMetric = await prisma.monthlyMetric.findFirst({
    orderBy: { month: "desc" },
    select: { month: true }
  });

  return latestMetric?.month ?? null;
}

async function fetchUseCases(
  filters?: UseCaseFilters,
  options: { allMonths?: boolean } = {}
): Promise<UseCaseRecord[]> {
  const latestMonth = options.allMonths ? null : await getLatestMetricMonth();
  const monthlyMetricsInclude = options.allMonths
    ? { orderBy: { month: "asc" as const } }
    : latestMonth
      ? { where: { month: latestMonth }, orderBy: { month: "desc" as const }, take: 1 }
      : { orderBy: { month: "desc" as const }, take: 1 };

  return prisma.aiUseCase.findMany({
    where: buildUseCaseWhere(filters),
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          normalizedName: true
        }
      },
      governanceControl: {
        select: {
          riskTier: true,
          riskScore: true,
          governanceScore: true,
          missingControlsJson: true,
          riskDriversJson: true
        }
      },
      monthlyMetrics: monthlyMetricsInclude
    }
  }) as unknown as Promise<UseCaseRecord[]>;
}

async function fetchCotsRows(params?: Pick<CotsAdoptionParams, "agency">): Promise<CotsRecord[]> {
  return prisma.cotsUseCase.findMany({
    where: buildCotsWhere(params),
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          normalizedName: true
        }
      }
    }
  }) as unknown as Promise<CotsRecord[]>;
}

function latestMetric(useCase: UseCaseRecord) {
  if (useCase.monthlyMetrics.length === 0) {
    return null;
  }

  return [...useCase.monthlyMetrics].sort((left, right) => right.month.getTime() - left.month.getTime())[0];
}

function riskScoreFor(useCase: UseCaseRecord) {
  return latestMetric(useCase)?.riskScore ?? useCase.governanceControl?.riskScore ?? 0;
}

function governanceScoreFor(useCase: UseCaseRecord) {
  return latestMetric(useCase)?.governanceScore ?? useCase.governanceControl?.governanceScore ?? 0;
}

function adoptionScoreFor(useCase: UseCaseRecord) {
  return latestMetric(useCase)?.adoptionScore ?? 0;
}

function groupLabel(useCase: UseCaseRecord, dimension: InventoryBreakdownParams["dimension"]) {
  switch (dimension) {
    case "agency":
      return useCase.agency.name;
    case "stage":
      return useCase.normalizedStage ?? "Unknown";
    case "topic":
      return useCase.normalizedTopicArea ?? "Unknown";
    case "classification":
      return useCase.normalizedClassification ?? "Unknown";
    case "bureau":
      return useCase.agencyBureau ?? "Unknown bureau";
    default:
      return "Unknown";
  }
}

function metricValue(row: Omit<InventoryBreakdownRow, "value">, metric: InventoryBreakdownParams["metric"]) {
  switch (metric) {
    case "active_systems":
      return row.activeSystems;
    case "high_impact":
      return row.highImpactSystems;
    case "pii":
      return row.piiSystems;
    case "ato_coverage":
      return row.atoCoverageRate;
    case "avg_risk":
      return row.averageRiskScore;
    case "avg_governance":
      return row.averageGovernanceScore;
    case "systems":
    default:
      return row.systems;
  }
}

function metricTitle(metric: InventoryBreakdownParams["metric"]) {
  const labels: Record<InventoryBreakdownParams["metric"], string> = {
    systems: "AI systems",
    active_systems: "Active systems",
    high_impact: "High-impact systems",
    pii: "Systems involving PII",
    ato_coverage: "ATO coverage rate",
    avg_risk: "Average risk score",
    avg_governance: "Average governance score"
  };

  return labels[metric];
}

function dimensionTitle(dimension: InventoryBreakdownParams["dimension"]) {
  const labels: Record<InventoryBreakdownParams["dimension"], string> = {
    agency: "agency",
    stage: "development stage",
    topic: "topic area",
    classification: "AI classification",
    bureau: "bureau"
  };

  return labels[dimension];
}

function breakdownTitle(params: Pick<InventoryBreakdownParams, "dimension" | "metric">) {
  if (params.dimension === "stage" && params.metric === "systems") {
    return "Portfolio composition by development stage";
  }

  if (params.dimension === "agency" && params.metric === "high_impact") {
    return "Highest high-impact concentration by agency";
  }

  if (params.dimension === "classification" && params.metric === "systems") {
    return "AI technology mix by classification";
  }

  return `${metricTitle(params.metric)} by ${dimensionTitle(params.dimension)}`;
}

function breakdownSubtitle(params: Pick<InventoryBreakdownParams, "dimension" | "metric">, systemCount: number) {
  if (params.dimension === "stage" && params.metric === "systems") {
    return `Shows where the reported portfolio sits across deployed, pilot, pre-deployment, retired, and unknown stages. Based on ${formatNumber(systemCount)} systems.`;
  }

  if (params.dimension === "agency" && params.metric === "high_impact") {
    return `Ranks agencies by systems reported as exactly "High-impact". Based on ${formatNumber(systemCount)} systems.`;
  }

  if (params.dimension === "classification" && params.metric === "systems") {
    return `Shows the reported AI capability mix across ${formatNumber(systemCount)} systems.`;
  }

  return `Ranked ${dimensionTitle(params.dimension)} view across ${formatNumber(systemCount)} AI systems.`;
}

function riskTierRank(tier: string) {
  const ranks: Record<string, number> = {
    Critical: 4,
    High: 3,
    Medium: 2,
    Low: 1
  };

  return ranks[tier] ?? 0;
}

function riskCommandTitle(params: RiskCommandCenterParams) {
  if (params.highImpactOnly && params.deployedOnly) {
    return "Deployed High-Impact Systems Needing Review";
  }

  if (params.piiOnly) {
    return "PII Systems Needing Review";
  }

  if (params.deployedOnly) {
    return "Deployed Systems Governance Review Queue";
  }

  if (params.highImpactOnly) {
    return "High-Impact Systems Governance Review Queue";
  }

  return "Governance Risk Command Center";
}

function riskCommandSubtitle(params: RiskCommandCenterParams, rowCount: number) {
  const validTiers = ["critical", "high", "medium", "low"];
  const effectiveTier = params.riskTier?.trim().toLowerCase();
  const scope = [
    params.deployedOnly ? "deployed" : null,
    params.highImpactOnly ? "high-impact" : null,
    params.piiOnly ? "PII" : null,
    effectiveTier && validTiers.includes(effectiveTier) ? `${effectiveTier} tier` : null
  ]
    .filter(Boolean)
    .join(", ");

  return `${scope ? `Filtered to ${scope} systems. ` : ""}${formatNumber(rowCount)} systems are prioritized with app-derived review scores. Blank or unknown governance fields are shown as "Not reported" or "Needs review", not as compliance findings.`;
}

function aggregateUseCases(useCases: UseCaseRecord[], dimension: InventoryBreakdownParams["dimension"]) {
  const groups = new Map<string, Aggregate>();

  for (const useCase of useCases) {
    const label = groupLabel(useCase, dimension);
    const group =
      groups.get(label) ??
      {
        label,
        systems: 0,
        activeSystems: 0,
        highImpactSystems: 0,
        piiSystems: 0,
        atoSystems: 0,
        riskScoreTotal: 0,
        governanceScoreTotal: 0,
        scoreCount: 0
      };

    group.systems += 1;
    group.activeSystems += useCase.activeSystemBoolean ? 1 : 0;
    group.highImpactSystems += useCase.highImpactBoolean ? 1 : 0;
    group.piiSystems += useCase.piiBoolean === true ? 1 : 0;
    group.atoSystems += useCase.atoBoolean === true ? 1 : 0;
    group.riskScoreTotal += riskScoreFor(useCase);
    group.governanceScoreTotal += governanceScoreFor(useCase);
    group.scoreCount += 1;
    groups.set(label, group);
  }

  return groups;
}

function toBreakdownRows(groups: Map<string, Aggregate>, metric: InventoryBreakdownParams["metric"]) {
  return [...groups.values()]
    .map((group) => {
      const row = {
        label: group.label,
        systems: group.systems,
        activeSystems: group.activeSystems,
        highImpactSystems: group.highImpactSystems,
        piiSystems: group.piiSystems,
        atoCoverageRate: group.systems > 0 ? round((group.atoSystems / group.systems) * 100, 1) : 0,
        averageRiskScore: group.scoreCount > 0 ? round(group.riskScoreTotal / group.scoreCount, 1) : 0,
        averageGovernanceScore:
          group.scoreCount > 0 ? round(group.governanceScoreTotal / group.scoreCount, 1) : 0
      };

      return {
        ...row,
        value: metricValue(row, metric)
      };
    })
    .sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

function cotsProductNames(row: CotsRecord) {
  const parsedNames = asStringArray(row.productNamesJson);
  if (parsedNames.length > 0) {
    return parsedNames;
  }

  return row.productText ? [row.productText] : ["Unspecified product"];
}

function topLabels(values: Iterable<string>, limit = 3) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) {
      continue;
    }

    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label]) => label);
}

function makeKpi(
  label: string,
  value: string | number,
  detail?: string,
  syntheticMetric = false,
  tone: BiKpi["tone"] = "neutral"
): BiKpi {
  return {
    label,
    value,
    detail,
    syntheticMetric,
    tone
  };
}

export async function getMissionControlSnapshot(
  filters?: UseCaseFilters
): Promise<MissionControlSnapshot> {
  const useCases = await fetchUseCases(filters);
  const totalSystems = useCases.length;
  const activeSystems = useCases.filter((useCase) => useCase.activeSystemBoolean).length;
  const deployedSystems = useCases.filter((useCase) => useCase.normalizedStage === "Deployed").length;
  const pilotSystems = useCases.filter((useCase) => useCase.normalizedStage === "Pilot").length;
  const highImpactSystems = useCases.filter((useCase) => useCase.highImpactBoolean).length;
  const piiSystems = useCases.filter((useCase) => useCase.piiBoolean === true).length;
  const atoSystems = useCases.filter((useCase) => useCase.atoBoolean === true).length;
  const atoCoverageRate = totalSystems > 0 ? (atoSystems / totalSystems) * 100 : 0;
  const riskScores = useCases.map(riskScoreFor);
  const governanceScores = useCases.map(governanceScoreFor);
  const latestMetrics = useCases.map(latestMetric).filter((metric): metric is MonthlyMetricRecord => metric != null);
  const currentMonthlyRunRate = sum(latestMetrics.map((metric) => metric.estimatedMonthlyCost));
  const agencyCount = new Set(useCases.map((useCase) => useCase.agency.id)).size;

  const stageRows = toBreakdownRows(aggregateUseCases(useCases, "stage"), "systems");
  const agencyHighImpactRows = toBreakdownRows(aggregateUseCases(useCases, "agency"), "high_impact")
    .filter((row) => row.highImpactSystems > 0)
    .slice(0, 10);

  const topHighImpactAgency = agencyHighImpactRows[0];
  const activeShare = totalSystems > 0 ? (activeSystems / totalSystems) * 100 : 0;
  const highImpactShare = totalSystems > 0 ? (highImpactSystems / totalSystems) * 100 : 0;
  const piiShare = totalSystems > 0 ? (piiSystems / totalSystems) * 100 : 0;
  const averageRiskScore = round(average(riskScores), 1);
  const averageGovernanceScore = round(average(governanceScores), 1);
  const governanceGap = Math.max(0, round(100 - averageGovernanceScore, 1));

  return {
    componentType: "mission_control",
    title: "Federal AI Mission Control",
    subtitle: "Board-ready portfolio view of AI inventory, governance readiness, exposure, and synthetic operating telemetry.",
    kpis: [
      makeKpi("Total systems", formatNumber(totalSystems), "Individually reported AI use cases"),
      makeKpi(
        "Active systems",
        formatNumber(activeSystems),
        `${formatPercent(activeShare)} are deployed or pilot`,
        false,
        activeShare > 65 ? "warning" : "neutral"
      ),
      makeKpi("Deployed systems", formatNumber(deployedSystems), "In production or operational use"),
      makeKpi("Pilot systems", formatNumber(pilotSystems), "Active pilots to monitor before scaling"),
      makeKpi(
        "High-impact systems",
        formatNumber(highImpactSystems),
        `${formatPercent(highImpactShare)} of reported inventory`,
        false,
        highImpactSystems > 0 ? "warning" : "success"
      ),
      makeKpi(
        "PII exposure",
        formatNumber(piiSystems),
        `${formatPercent(piiShare)} involve personally identifiable information`,
        false,
        piiSystems > 0 ? "warning" : "success"
      ),
      makeKpi(
        "ATO coverage",
        formatPercent(atoCoverageRate),
        "Share reporting an authority to operate",
        false,
        atoCoverageRate < 70 ? "warning" : "success"
      ),
      makeKpi(
        "Portfolio risk score",
        averageRiskScore,
        "App-derived review prioritization, not an official OMB score",
        false,
        averageRiskScore >= 60 ? "warning" : "neutral"
      ),
      makeKpi(
        "Governance readiness",
        averageGovernanceScore,
        `${formatNumber(governanceGap)} points of estimated readiness gap`,
        false,
        averageGovernanceScore < 60 ? "warning" : "success"
      ),
      makeKpi(
        "Est. monthly run-rate",
        formatCurrency(currentMonthlyRunRate),
        "Synthetic cost estimate derived from inventory attributes",
        true,
        "warning"
      )
    ],
    findings: [
      `${formatNumber(totalSystems)} individually reported AI systems are visible across ${formatNumber(agencyCount)} agencies, creating a real portfolio baseline for executive oversight.`,
      `${formatNumber(activeSystems)} systems are active, including ${formatNumber(deployedSystems)} deployed systems and ${formatNumber(pilotSystems)} pilots, so governance capacity should focus on systems already in use or nearing scale.`,
      `Synthetic telemetry estimates the current monthly AI run-rate at ${formatCurrency(currentMonthlyRunRate)}, giving leaders a stable proxy for cost and utilization planning.`
    ],
    risks: [
      `${formatNumber(highImpactSystems)} systems are reported as high-impact and should remain in the priority review queue until required controls are reported and current.`,
      `${formatNumber(piiSystems)} systems involve PII, making privacy documentation, PIA availability, and ATO status priority review areas.`,
      topHighImpactAgency
        ? `${topHighImpactAgency.label} has the largest high-impact concentration in this view with ${formatNumber(topHighImpactAgency.highImpactSystems)} systems, indicating where executive attention may need to concentrate first.`
        : "No high-impact agency concentration is available for this view."
    ],
    recommendedActions: [
      "Start with deployed high-impact systems that have missing or not reported governance controls.",
      "Prioritize PII systems where ATO status, PIA links, or privacy controls are missing, unknown, or not reported.",
      "Use the synthetic cost and utilization views to identify scaling opportunities only after governance readiness is understood."
    ],
    compositionChart: {
      title: "Portfolio composition by development stage",
      data: stageRows.map((row) => ({
        label: `${row.label}`,
        value: row.systems,
        detail: `${formatNumber(row.systems)} systems`
      }))
    },
    riskChart: {
      title: "Highest high-impact concentration by agency",
      data: agencyHighImpactRows.map((row) => ({
        label: row.label,
        value: row.highImpactSystems,
        secondaryValue: row.systems,
        detail: `${formatNumber(row.highImpactSystems)} high-impact of ${formatNumber(row.systems)} systems`
      }))
    },
    syntheticMetric: true,
    disclosure: SYNTHETIC_DISCLOSURE
  };
}

export async function getInventoryBreakdown(
  params: InventoryBreakdownParams
): Promise<InventoryBreakdownResult> {
  const limit = clampLimit(params.limit);
  const useCases = await fetchUseCases(params.filters);
  const rows = toBreakdownRows(aggregateUseCases(useCases, params.dimension), params.metric).slice(0, limit);

  return {
    componentType: "breakdown",
    title: breakdownTitle(params),
    subtitle: breakdownSubtitle(params, useCases.length),
    chartType: "bar",
    data: rows.map((row) => ({
      label: row.label,
      value: row.value,
      secondaryValue: row.systems,
      detail:
        params.metric === "high_impact"
          ? `${formatNumber(row.highImpactSystems)} high-impact of ${formatNumber(row.systems)} systems`
          : `${formatNumber(row.systems)} systems`
    })),
    rows
  };
}

export async function getRiskCommandCenter(
  params: RiskCommandCenterParams = {}
): Promise<RiskCommandCenterResult> {
  const limit = clampLimit(params.limit);
  const useCases = await fetchUseCases({
    agency: isPlaceholderValue(params.agency) ? undefined : params.agency,
    highImpactOnly: params.highImpactOnly,
    piiOnly: params.piiOnly,
    deployedOnly: params.deployedOnly
  });
  const rows = useCases
    .map<GovernanceRiskRow>((useCase) => {
      const missingControls = asStringArray(useCase.governanceControl?.missingControlsJson);
      const riskDrivers = asStringArray(useCase.governanceControl?.riskDriversJson);

      return {
        useCaseName: useCase.useCaseName,
        agency: useCase.agency.name,
        bureau: useCase.agencyBureau,
        stage: useCase.normalizedStage,
        topic: useCase.normalizedTopicArea,
        classification: useCase.normalizedClassification,
        highImpact: useCase.highImpactBoolean,
        pii: useCase.piiBoolean,
        ato: useCase.atoBoolean,
        riskTier: useCase.governanceControl?.riskTier ?? "Unknown",
        riskScore: round(useCase.governanceControl?.riskScore ?? riskScoreFor(useCase), 1),
        governanceScore: round(useCase.governanceControl?.governanceScore ?? governanceScoreFor(useCase), 1),
        missingControls,
        riskDrivers
      };
    })
    .filter((row) => {
      const validTiers = ["critical", "high", "medium", "low"];
      const requestedTier = params.riskTier?.trim().toLowerCase();
      return requestedTier && validTiers.includes(requestedTier)
        ? row.riskTier.toLowerCase() === requestedTier
        : true;
    });

  const highImpactNeedingReview = rows.filter(
    (row) => row.highImpact && (row.missingControls.length > 0 || row.governanceScore < 60)
  ).length;
  const piiNeedingReview = rows.filter(
    (row) => row.pii === true && (row.ato !== true || row.missingControls.length > 0 || row.governanceScore < 60)
  ).length;
  const deployedMissingAto = rows.filter((row) => row.stage === "Deployed" && row.ato !== true).length;
  const needsReviewRows = rows.filter(
    (row) =>
      row.riskTier === "Critical" ||
      row.riskTier === "High" ||
      row.missingControls.length > 0 ||
      row.ato !== true ||
      row.governanceScore < 60
  ).length;

  const sortedRows = rows.sort((left, right) => {
    switch (params.sortBy ?? "risk_score") {
      case "governance_score":
        return (
          left.governanceScore - right.governanceScore ||
          riskTierRank(right.riskTier) - riskTierRank(left.riskTier) ||
          right.riskScore - left.riskScore ||
          right.missingControls.length - left.missingControls.length
        );
      case "missing_controls":
        return (
          right.missingControls.length - left.missingControls.length ||
          riskTierRank(right.riskTier) - riskTierRank(left.riskTier) ||
          right.riskScore - left.riskScore ||
          left.governanceScore - right.governanceScore
        );
      case "risk_score":
      default:
        return (
          riskTierRank(right.riskTier) - riskTierRank(left.riskTier) ||
          right.riskScore - left.riskScore ||
          right.missingControls.length - left.missingControls.length ||
          left.governanceScore - right.governanceScore
        );
    }
  });

  return {
    componentType: "risk_command_center",
    title: riskCommandTitle(params),
    subtitle: riskCommandSubtitle(params, rows.length),
    kpis: [
      makeKpi(
        "Needs review queue",
        formatNumber(needsReviewRows),
        "Prioritized by app-derived risk, ATO, and governance signals",
        false,
        needsReviewRows > 0 ? "warning" : "success"
      ),
      makeKpi(
        "Critical tier",
        formatNumber(rows.filter((row) => row.riskTier === "Critical").length),
        "App-derived prioritization tier, not an official OMB score",
        false,
        rows.some((row) => row.riskTier === "Critical") ? "critical" : "neutral"
      ),
      makeKpi(
        "High tier",
        formatNumber(rows.filter((row) => row.riskTier === "High").length),
        "Systems with elevated review priority",
        false,
        rows.some((row) => row.riskTier === "High") ? "warning" : "neutral"
      ),
      makeKpi(
        "High-impact needs review",
        formatNumber(highImpactNeedingReview),
        "High-impact systems with missing controls or low readiness",
        false,
        highImpactNeedingReview > 0 ? "warning" : "success"
      ),
      makeKpi(
        "ATO not reported",
        formatNumber(deployedMissingAto),
        "Deployed systems with missing, unknown, or negative ATO status",
        false,
        deployedMissingAto > 0 ? "warning" : "success"
      ),
      makeKpi(
        "PII needs review",
        formatNumber(piiNeedingReview),
        "PII systems with ATO, control, or readiness gaps",
        false,
        piiNeedingReview > 0 ? "warning" : "success"
      )
    ],
    rows: sortedRows.slice(0, limit)
  };
}

export async function getCotsAdoption(params: CotsAdoptionParams): Promise<CotsAdoptionResult> {
  const limit = clampLimit(params.limit);
  const rows = await fetchCotsRows(params);
  const yesRows = rows.filter((row) => row.agencyUseBoolean === true);
  const agenciesReportingUse = new Set(yesRows.map((row) => row.agency.id)).size;
  const uniqueProducts = new Set<string>();
  const estimatedLicenseExposure = sum(rows.map((row) => row.estimatedLicenseMidpoint ?? 0));
  const estimatedMonthlySpend = sum(rows.map((row) => row.estimatedMonthlySpend ?? 0));

  for (const row of rows) {
    for (const productName of asStringArray(row.productNamesJson)) {
      uniqueProducts.add(productName.toLowerCase());
    }
  }

  const cotsRows = buildCotsRows(rows, params.view).slice(0, limit);

  return {
    componentType: "cots_adoption",
    title: cotsTitle(params.view),
    subtitle: cotsSubtitle(params.view, rows.length),
    kpis: [
      makeKpi(
        "Agencies reporting COTS AI use",
        formatNumber(agenciesReportingUse),
        "Agencies with rows marked Yes",
        false,
        agenciesReportingUse > 0 ? "warning" : "neutral"
      ),
      makeKpi(
        "COTS use cases marked Yes",
        formatNumber(yesRows.length),
        "Reported agency adoption rows"
      ),
      makeKpi(
        "Unique commercial products",
        formatNumber(uniqueProducts.size),
        "Parsed product names across COTS rows",
        false,
        uniqueProducts.size > 0 ? "warning" : "neutral"
      ),
      makeKpi(
        "Estimated license exposure",
        formatNumber(estimatedLicenseExposure),
        "Synthetic midpoint from reported license buckets",
        true,
        "warning"
      ),
      makeKpi(
        "Estimated COTS monthly spend",
        formatCurrency(estimatedMonthlySpend),
        "Synthetic estimate at $20 per midpoint license per month",
        true,
        "warning"
      )
    ],
    data: cotsRows.map((row) => ({
      label: row.label,
      value: row.value,
      secondaryValue: row.estimatedMonthlySpend,
      detail: cotsChartDetail(params.view, row)
    })),
    rows: cotsRows,
    note: "COTS rows are real OMB records. License exposure and monthly spend are synthetic estimates from reported license buckets and a deterministic $20 per midpoint license assumption."
  };
}

function cotsTitle(view: CotsAdoptionParams["view"]) {
  const titles: Record<CotsAdoptionParams["view"], string> = {
    overview: "COTS AI Adoption Overview",
    by_agency: "COTS AI Adoption and Tool Exposure by Agency",
    by_use_case: "Common COTS AI Tasks by Adoption",
    by_product: "Commercial AI Products by Reported Use",
    license_buckets: "COTS License Bucket Distribution"
  };

  return titles[view];
}

function cotsSubtitle(view: CotsAdoptionParams["view"], rowCount: number) {
  const subtitles: Record<CotsAdoptionParams["view"], string> = {
    overview: "Executive view of commercial AI use, product exposure, license exposure, and synthetic spend.",
    by_agency: "Agency-level AI tool sprawl view showing COTS adoption rows, product exposure, licenses, and spend estimates.",
    by_use_case: "Common COTS AI tasks ranked by reported agency adoption and commercial product exposure.",
    by_product: "Commercial AI products ranked by reported COTS use across agencies and use cases.",
    license_buckets: "Reported license bucket distribution with synthetic midpoint exposure and monthly spend estimates."
  };

  return `${subtitles[view]} Based on ${formatNumber(rowCount)} COTS inventory rows.`;
}

function cotsChartDetail(view: CotsAdoptionParams["view"], row: CotsAdoptionRow) {
  if (view === "by_agency") {
    return `${formatNumber(row.yesRows)} Yes rows, ${formatNumber(row.uniqueProducts)} products`;
  }

  if (view === "by_product") {
    return `${formatNumber(row.systems)} rows across ${formatNumber(row.agencies)} agencies`;
  }

  if (view === "license_buckets") {
    return `${formatNumber(row.estimatedLicenseExposure)} estimated license midpoint`;
  }

  if (view === "by_use_case") {
    return `${formatNumber(row.yesRows)} Yes rows, ${formatNumber(row.agencies)} agencies`;
  }

  return `${formatNumber(row.systems)} COTS rows`;
}

function buildCotsRows(rows: CotsRecord[], view: CotsAdoptionParams["view"]): CotsAdoptionRow[] {
  const groups = new Map<
    string,
    {
      label: string;
      systems: number;
      yesRows: number;
      agencyIds: Set<string>;
      agencies: Set<string>;
      agencyUses: string[];
      licenseBuckets: string[];
      productNames: string[];
      useCases: string[];
      estimatedLicenseExposure: number;
      estimatedMonthlySpend: number;
      uniqueProducts: Set<string>;
      sortValue: number;
      agency?: string;
      useCase?: string;
      product?: string;
      licenseBucket?: string | null;
    }
  >();

  const addRow = (
    label: string,
    row: CotsRecord,
    extras: Pick<CotsAdoptionRow, "agency" | "useCase" | "product" | "licenseBucket"> = {}
  ) => {
    const group =
      groups.get(label) ??
      {
        label,
        systems: 0,
        yesRows: 0,
        agencyIds: new Set<string>(),
        agencies: new Set<string>(),
        agencyUses: [],
        licenseBuckets: [],
        productNames: [],
        useCases: [],
        estimatedLicenseExposure: 0,
        estimatedMonthlySpend: 0,
        uniqueProducts: new Set<string>(),
        sortValue: 0,
        ...extras
      };
    const productNames = cotsProductNames(row);

    group.systems += 1;
    group.yesRows += row.agencyUseBoolean === true ? 1 : 0;
    group.agencyIds.add(row.agency.id);
    group.agencies.add(row.agency.name);
    group.useCases.push(row.aiUseCase || "Unspecified COTS AI use case");
    if (row.agencyUse) {
      group.agencyUses.push(row.agencyUse);
    }
    if (row.licenseBucket) {
      group.licenseBuckets.push(row.licenseBucket);
    }
    group.productNames.push(...productNames);
    for (const productName of productNames) {
      group.uniqueProducts.add(productName.toLowerCase());
    }
    group.estimatedLicenseExposure += row.estimatedLicenseMidpoint ?? 0;
    group.estimatedMonthlySpend += row.estimatedMonthlySpend ?? 0;
    groups.set(label, group);
  };

  for (const row of rows) {
    if (view === "by_product") {
      for (const productName of cotsProductNames(row)) {
        addRow(productName, row, { product: productName });
      }
      continue;
    }

    if (view === "by_use_case") {
      addRow(row.aiUseCase || "Unspecified use case", row, { useCase: row.aiUseCase });
      continue;
    }

    if (view === "license_buckets") {
      const bucket = row.licenseBucket ?? "Unknown license bucket";
      addRow(bucket, row, { licenseBucket: row.licenseBucket });
      continue;
    }

    addRow(row.agency.name, row, { agency: row.agency.name });
  }

  return [...groups.values()]
    .map((group) => {
      const products = topLabels(group.productNames, 4);
      const useCases = topLabels(group.useCases, 2);
      const licenseBuckets = topLabels(group.licenseBuckets, 1);
      const agencies = topLabels(group.agencies, 2);
      const uniqueProductCount = group.uniqueProducts.size;
      const value =
        view === "by_agency"
          ? uniqueProductCount || group.yesRows || group.systems
          : view === "license_buckets"
            ? group.systems
            : group.systems;

      return {
        label: group.label,
        agency:
          group.agency ??
          (view === "by_agency"
            ? group.label
            : agencies.length > 0
              ? agencies.join(", ")
              : `${formatNumber(group.agencyIds.size)} agencies`),
        useCase:
          group.useCase ??
          (view === "by_use_case"
            ? group.label
            : useCases.length > 0
              ? useCases.join(", ")
              : `${formatNumber(group.systems)} COTS rows`),
        product: group.product,
        products,
        agencyUse: `${formatNumber(group.yesRows)} Yes / ${formatNumber(group.systems)} rows`,
        licenseBucket: group.licenseBucket ?? licenseBuckets[0] ?? null,
        systems: group.systems,
        yesRows: group.yesRows,
        agencies: group.agencyIds.size,
        uniqueProducts: uniqueProductCount,
        estimatedLicenseExposure: group.estimatedLicenseExposure,
        estimatedMonthlySpend: round(group.estimatedMonthlySpend, 2),
        value
      };
    })
    .sort((left, right) => {
      if (view === "by_agency") {
        return (
          right.uniqueProducts - left.uniqueProducts ||
          right.yesRows - left.yesRows ||
          right.estimatedMonthlySpend - left.estimatedMonthlySpend ||
          left.label.localeCompare(right.label)
        );
      }

      if (view === "license_buckets") {
        return right.estimatedLicenseExposure - left.estimatedLicenseExposure || right.systems - left.systems;
      }

      return (
        right.value - left.value ||
        right.agencies - left.agencies ||
        right.estimatedMonthlySpend - left.estimatedMonthlySpend ||
        left.label.localeCompare(right.label)
      );
    });
}

export async function getCostIntelligence(
  params: CostIntelligenceParams
): Promise<CostIntelligenceResult> {
  const limit = clampLimit(params.limit);
  const useCases = await fetchUseCases(
    {
      agency: params.agency,
      classification: params.classification
    },
    { allMonths: true }
  );
  const latestMetrics = useCases
    .map((useCase) => ({ useCase, metric: latestMetric(useCase) }))
    .filter((entry): entry is { useCase: UseCaseRecord; metric: MonthlyMetricRecord } => entry.metric != null);
  const currentMonthlyCost = sum(latestMetrics.map((entry) => entry.metric.estimatedMonthlyCost));
  const monthlyTaskVolume = sum(latestMetrics.map((entry) => entry.metric.taskVolume));
  const monthlyHoursSaved = sum(latestMetrics.map((entry) => entry.metric.estimatedHoursSaved));
  const monthlyValueCreated = sum(latestMetrics.map((entry) => entry.metric.estimatedValueCreated));
  const averageUtilization = average(latestMetrics.map((entry) => entry.metric.utilizationScore));
  const averageGovernance = average(latestMetrics.map((entry) => entry.metric.governanceScore));
  const data = buildCostChartData(useCases, params.view, limit);
  const savingsRows = buildSavingsRows(latestMetrics).slice(0, limit);

  return {
    componentType: "cost_intelligence",
    title: costTitle(params.view),
    subtitle: costSubtitle(params.view, useCases.length),
    chartType: params.view === "trend" || params.view === "roi" ? "line" : "bar",
    kpis: [
      makeKpi(
        "Estimated current monthly cost",
        formatCurrency(currentMonthlyCost),
        "Synthetic estimate for the latest generated month",
        true,
        "warning"
      ),
      makeKpi(
        "Estimated annualized run-rate",
        formatCurrency(currentMonthlyCost * 12),
        "Synthetic current-month cost multiplied by 12",
        true,
        "warning"
      ),
      makeKpi(
        "Estimated monthly task volume",
        formatNumber(monthlyTaskVolume),
        "Synthetic task volume in latest generated month",
        true
      ),
      makeKpi(
        "Estimated hours saved",
        formatNumber(monthlyHoursSaved),
        "Synthetic productivity proxy",
        true
      ),
      makeKpi(
        "Estimated value created",
        formatCurrency(monthlyValueCreated),
        `Avg utilization ${round(averageUtilization, 1)}; avg governance ${round(averageGovernance, 1)}`,
        true
      )
    ],
    data,
    rows: params.view === "savings_opportunities" ? savingsRows : [],
    syntheticMetric: true,
    disclosure: SYNTHETIC_DISCLOSURE
  };
}

function costTitle(view: CostIntelligenceParams["view"]) {
  const titles: Record<CostIntelligenceParams["view"], string> = {
    trend: "Estimated AI Spend Trend",
    by_agency: "Estimated AI Cost by Agency",
    by_classification: "Estimated AI Cost by Classification",
    savings_opportunities: "Savings Opportunity Review",
    roi: "Estimated ROI Simulation"
  };

  return titles[view];
}

function costSubtitle(view: CostIntelligenceParams["view"], systemCount: number) {
  const subtitles: Record<CostIntelligenceParams["view"], string> = {
    trend: "12-month synthetic spend trend derived from development stage, AI classification, high-impact status, PII exposure, and governance signals.",
    by_agency: "Compares estimated current monthly cost and average governance readiness by agency.",
    by_classification: "Compares estimated current monthly cost and average governance readiness by AI classification.",
    savings_opportunities: "Systems flagged for high estimated cost, weak utilization, low task volume, low governance readiness, high cost per task, or early-stage spend.",
    roi: "Synthetic value-created trend net of estimated monthly cost."
  };

  return `${subtitles[view]} Based on ${formatNumber(systemCount)} AI systems with generated monthly telemetry.`;
}

function buildCostChartData(useCases: UseCaseRecord[], view: CostIntelligenceParams["view"], limit: number) {
  if (view === "trend" || view === "roi") {
    const monthGroups = new Map<string, { cost: number; value: number; tasks: number }>();

    for (const useCase of useCases) {
      for (const metric of useCase.monthlyMetrics) {
        const label = metric.month.toISOString().slice(0, 7);
        const group = monthGroups.get(label) ?? { cost: 0, value: 0, tasks: 0 };
        group.cost += metric.estimatedMonthlyCost;
        group.value += metric.estimatedValueCreated;
        group.tasks += metric.taskVolume;
        monthGroups.set(label, group);
      }
    }

    return [...monthGroups.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([label, group]) => ({
        label,
        value: round(view === "roi" ? group.value - group.cost : group.cost, 2),
        secondaryValue: group.tasks,
        detail:
          view === "roi"
            ? `${formatCurrency(group.value - group.cost)} estimated net value; ${formatNumber(group.tasks)} tasks`
            : `${formatCurrency(group.cost)} estimated spend; ${formatNumber(group.tasks)} tasks`
      }));
  }

  const latestEntries = useCases
    .map((useCase) => ({ useCase, metric: latestMetric(useCase) }))
    .filter((entry): entry is { useCase: UseCaseRecord; metric: MonthlyMetricRecord } => entry.metric != null);
  const groups = new Map<
    string,
    {
      cost: number;
      governanceScores: number[];
      systems: number;
      taskVolume: number;
    }
  >();

  for (const { useCase, metric } of latestEntries) {
    const label =
      view === "by_classification"
        ? useCase.normalizedClassification ?? "Unknown"
        : useCase.agency.name;
    const group = groups.get(label) ?? {
      cost: 0,
      governanceScores: [],
      systems: 0,
      taskVolume: 0
    };

    group.cost += metric.estimatedMonthlyCost;
    group.governanceScores.push(metric.governanceScore);
    group.systems += 1;
    group.taskVolume += metric.taskVolume;
    groups.set(label, group);
  }

  return [...groups.entries()]
    .map(([label, group]) => ({
      label,
      value: round(group.cost, 2),
      secondaryValue: round(average(group.governanceScores), 1),
      detail: `${formatCurrency(group.cost)} estimated monthly cost; governance ${round(average(group.governanceScores), 1)}; ${formatNumber(group.systems)} systems`
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

function percentile(values: number[], percentileValue: number) {
  const sortedValues = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right);

  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentileValue) - 1)
  );

  return sortedValues[index];
}

function buildSavingsRows(
  latestEntries: Array<{ useCase: UseCaseRecord; metric: MonthlyMetricRecord }>
): SavingsOpportunityRow[] {
  const costs = latestEntries.map((entry) => entry.metric.estimatedMonthlyCost);
  const costPerTasks = latestEntries.map(({ metric }) =>
    metric.taskVolume > 0 ? metric.estimatedMonthlyCost / metric.taskVolume : metric.estimatedMonthlyCost
  );
  const taskVolumes = latestEntries.map((entry) => entry.metric.taskVolume);
  const highCostThreshold = Math.max(1000, percentile(costs, 0.75));
  const highCostPerTaskThreshold = Math.max(1.25, percentile(costPerTasks, 0.75));
  const lowTaskThreshold = Math.max(250, percentile(taskVolumes, 0.25));

  return latestEntries
    .map(({ useCase, metric }) => {
      const costPerTask = metric.taskVolume > 0 ? metric.estimatedMonthlyCost / metric.taskVolume : metric.estimatedMonthlyCost;
      const reasons = [
        metric.estimatedMonthlyCost >= highCostThreshold && "High estimated cost",
        metric.utilizationScore < 35 && "Low utilization score",
        metric.taskVolume <= lowTaskThreshold && "Low task volume",
        metric.governanceScore < 50 && "Low governance readiness",
        costPerTask >= highCostPerTaskThreshold && "High cost per task",
        ["Pre-deployment", "Pilot"].includes(useCase.normalizedStage ?? "") &&
          metric.estimatedMonthlyCost >= Math.max(750, highCostThreshold * 0.7) &&
          "Early-stage system with elevated cost"
      ].filter(Boolean) as string[];
      const savingsRate = Math.min(
        0.35,
        0.1 +
          (metric.utilizationScore < 35 ? 0.08 : 0) +
          (metric.taskVolume <= lowTaskThreshold ? 0.05 : 0) +
          (metric.governanceScore < 50 ? 0.04 : 0) +
          (costPerTask >= highCostPerTaskThreshold ? 0.04 : 0) +
          (["Pre-deployment", "Pilot"].includes(useCase.normalizedStage ?? "") ? 0.04 : 0)
      );

      return {
        useCaseName: useCase.useCaseName,
        agency: useCase.agency.name,
        stage: useCase.normalizedStage,
        classification: useCase.normalizedClassification,
        estimatedMonthlyCost: round(metric.estimatedMonthlyCost, 2),
        taskVolume: metric.taskVolume,
        utilizationScore: round(metric.utilizationScore, 1),
        governanceScore: round(metric.governanceScore, 1),
        riskScore: round(metric.riskScore, 1),
        costPerTask: round(costPerTask, 2),
        estimatedMonthlySavings: round(metric.estimatedMonthlyCost * savingsRate, 2),
        opportunity: reasons.length > 0 ? reasons.join("; ") : "Monitor utilization and governance readiness"
      };
    })
    .filter(
      (row) =>
        row.estimatedMonthlyCost >= highCostThreshold ||
        row.utilizationScore < 35 ||
        row.taskVolume <= lowTaskThreshold ||
        row.governanceScore < 50 ||
        row.costPerTask >= highCostPerTaskThreshold ||
        (["Pre-deployment", "Pilot"].includes(row.stage ?? "") &&
          row.estimatedMonthlyCost >= Math.max(750, highCostThreshold * 0.7))
    )
    .sort(
      (left, right) =>
        right.estimatedMonthlySavings - left.estimatedMonthlySavings ||
        right.estimatedMonthlyCost - left.estimatedMonthlyCost ||
        left.utilizationScore - right.utilizationScore
    );
}

export async function searchUseCases(params: SearchUseCasesParams = {}): Promise<UseCaseSearchResult> {
  const limit = clampLimit(params.limit);
  const where = buildUseCaseWhere(params);
  const query = params.query?.trim();
  const queryTerms = query ? searchTerms(query) : [];

  if (query) {
    where.OR = buildSearchOrConditions([query, ...queryTerms]);
  }

  const candidateRows = (await prisma.aiUseCase.findMany({
    where,
    take: query ? Math.min(500, Math.max(limit * 20, 100)) : limit,
    orderBy: [{ highImpactBoolean: "desc" }, { useCaseName: "asc" }],
    include: {
      agency: {
        select: {
          id: true,
          name: true,
          normalizedName: true,
          abbreviation: true
        }
      }
    }
  })) as unknown as UseCaseRecord[];
  const rows = rankSearchRows(candidateRows, query, queryTerms).slice(0, limit);

  return {
    componentType: "use_case_search",
    title: searchTitle(params),
    subtitle: searchSubtitle(params, rows.length),
    rows: rows.map<UseCaseSearchRow>((row) => ({
      useCaseName: row.useCaseName,
      agency: row.agency.name,
      bureau: row.agencyBureau,
      stage: row.normalizedStage,
      topic: row.normalizedTopicArea,
      classification: row.normalizedClassification,
      highImpact: row.highImpactBoolean,
      pii: row.piiBoolean,
      ato: row.atoBoolean,
      snippet: compactSnippet(row, query)
    }))
  };
}

function buildSearchOrConditions(terms: string[]): Prisma.AiUseCaseWhereInput[] {
  return [...new Set(terms.map((term) => term.trim()).filter(Boolean))].flatMap((term) => [
    { useCaseName: { contains: term, mode: "insensitive" } },
    { problemSolved: { contains: term, mode: "insensitive" } },
    { benefits: { contains: term, mode: "insensitive" } },
    { systemOutputs: { contains: term, mode: "insensitive" } },
    { agencyBureau: { contains: term, mode: "insensitive" } },
    { topicArea: { contains: term, mode: "insensitive" } },
    { normalizedTopicArea: { contains: term, mode: "insensitive" } },
    { classification: { contains: term, mode: "insensitive" } },
    { normalizedClassification: { contains: term, mode: "insensitive" } },
    { isHighImpact: { contains: term, mode: "insensitive" } },
    { highImpactJustification: { contains: term, mode: "insensitive" } },
    { hasPii: { contains: term, mode: "insensitive" } },
    {
      agency: {
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { normalizedName: { contains: term, mode: "insensitive" } },
          { abbreviation: { contains: term, mode: "insensitive" } }
        ]
      }
    }
  ]);
}

function searchTerms(query: string) {
  const stopWords = new Set([
    "ai",
    "a",
    "an",
    "and",
    "are",
    "by",
    "does",
    "examples",
    "find",
    "for",
    "in",
    "involving",
    "me",
    "of",
    "related",
    "show",
    "systems",
    "the",
    "to",
    "use",
    "uses",
    "using",
    "what",
    "with"
  ]);
  const baseTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !stopWords.has(term));
  const aliases: Record<string, string[]> = {
    cv: ["computer vision"],
    dhs: ["department of homeland security"],
    dod: ["department of defense"],
    doe: ["department of energy", "department of education"],
    hhs: ["department of health and human services"],
    nlp: ["natural language processing"],
    va: ["department of veterans affairs"]
  };

  return [...new Set(baseTerms.flatMap((term) => [term, ...(aliases[term] ?? [])]))];
}

function rankSearchRows(rows: UseCaseRecord[], query?: string, terms: string[] = []) {
  if (!query) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftScore = searchRelevanceScore(left, query, terms);
    const rightScore = searchRelevanceScore(right, query, terms);

    return (
      rightScore - leftScore ||
      Number(right.highImpactBoolean) - Number(left.highImpactBoolean) ||
      Number(right.piiBoolean === true) - Number(left.piiBoolean === true) ||
      left.useCaseName.localeCompare(right.useCaseName)
    );
  });
}

function searchRelevanceScore(useCase: UseCaseRecord, query: string, terms: string[]) {
  const normalizedQuery = normalizeForSearch(query);
  const textFields = [
    useCase.useCaseName,
    useCase.problemSolved,
    useCase.benefits,
    useCase.systemOutputs,
    useCase.agency.name,
    useCase.agency.normalizedName,
    useCase.agency.abbreviation,
    useCase.agencyBureau,
    useCase.topicArea,
    useCase.normalizedTopicArea,
    useCase.classification,
    useCase.normalizedClassification
  ].map(normalizeForSearch);
  const weightedFields = [
    { value: normalizeForSearch(useCase.useCaseName), weight: 16 },
    { value: normalizeForSearch(useCase.agency.name), weight: 12 },
    { value: normalizeForSearch(useCase.agency.abbreviation), weight: 12 },
    { value: normalizeForSearch(useCase.classification), weight: 10 },
    { value: normalizeForSearch(useCase.normalizedClassification), weight: 10 },
    { value: normalizeForSearch(useCase.topicArea), weight: 10 },
    { value: normalizeForSearch(useCase.normalizedTopicArea), weight: 10 },
    { value: normalizeForSearch(useCase.agencyBureau), weight: 6 },
    { value: normalizeForSearch(useCase.problemSolved), weight: 4 },
    { value: normalizeForSearch(useCase.benefits), weight: 3 },
    { value: normalizeForSearch(useCase.systemOutputs), weight: 3 },
    { value: normalizeForSearch(useCase.isHighImpact), weight: 8 },
    { value: normalizeForSearch(useCase.hasPii), weight: 8 }
  ];
  let score = 0;

  for (const field of weightedFields) {
    if (normalizedQuery && field.value.includes(normalizedQuery)) {
      score += field.weight * 3;
    }

    for (const term of terms) {
      if (field.value.includes(normalizeForSearch(term))) {
        score += field.weight;
      }
    }
  }

  if (terms.length > 0 && terms.every((term) => textFields.some((field) => field.includes(normalizeForSearch(term))))) {
    score += 30;
  }

  if (useCase.highImpactBoolean && terms.some((term) => normalizeForSearch(term).includes("high-impact"))) {
    score += 18;
  }

  if (useCase.piiBoolean && terms.some((term) => normalizeForSearch(term) === "pii")) {
    score += 18;
  }

  return score;
}

function normalizeForSearch(value: string | null | undefined) {
  return value?.toLowerCase().replace(/\s+/g, " ").trim() ?? "";
}

function searchTitle(params: SearchUseCasesParams) {
  if (params.query) {
    return `Use cases matching "${params.query.trim()}"`;
  }

  const filters = searchFilterLabels(params);
  return filters.length > 0 ? `Use cases filtered by ${filters.join(", ")}` : "Use case search results";
}

function searchSubtitle(params: SearchUseCasesParams, rowCount: number) {
  const filters = searchFilterLabels(params);
  const scope = filters.length > 0 ? ` Filters: ${filters.join(", ")}.` : "";

  return `Showing ${formatNumber(rowCount)} ranked result${rowCount === 1 ? "" : "s"} across system name, problem solved, benefits, outputs, agency, bureau, topic, and classification.${scope}`;
}

function searchFilterLabels(params: SearchUseCasesParams) {
  return [
    params.agency && `agency ${params.agency}`,
    params.topic && `topic ${params.topic}`,
    params.classification && `classification ${params.classification}`,
    params.highImpactOnly && "high-impact only",
    params.piiOnly && "PII only",
    params.deployedOnly && "deployed only"
  ].filter(Boolean) as string[];
}

function compactSnippet(useCase: UseCaseRecord, query?: string) {
  const candidates = [
    { label: "Problem solved", value: useCase.problemSolved },
    { label: "Benefits", value: useCase.benefits },
    { label: "Outputs", value: useCase.systemOutputs },
    { label: "Bureau", value: useCase.agencyBureau },
    { label: "Topic", value: useCase.normalizedTopicArea ?? useCase.topicArea },
    { label: "Classification", value: useCase.normalizedClassification ?? useCase.classification },
    { label: "High-impact rationale", value: useCase.highImpactJustification }
  ]
    .filter((candidate): candidate is { label: string; value: string } => Boolean(candidate.value))
    .map((candidate) => ({
      label: candidate.label,
      value: candidate.value.replace(/\s+/g, " ").trim()
    }));
  const queryTerms = query ? [query, ...searchTerms(query)] : [];
  const matchingText =
    queryTerms.length > 0
      ? candidates.find((candidate) =>
          queryTerms.some((term) => normalizeForSearch(candidate.value).includes(normalizeForSearch(term)))
        )
      : null;
  const snippet = matchingText ?? candidates[0];

  return snippet ? `${snippet.label}: ${snippet.value}` : "No narrative description reported.";
}

export async function getAdoptionGovernanceMatrix(
  params: AdoptionGovernanceMatrixParams
): Promise<AdoptionGovernanceMatrixResult> {
  const limit = clampLimit(params.limit);
  const useCases = await fetchUseCases();
  const groups = new Map<
    string,
    {
      label: string;
      adoptionScores: number[];
      governanceScores: number[];
      riskScores: number[];
      activeSystems: number;
      highImpactSystems: number;
    }
  >();

  for (const useCase of useCases) {
    const label =
      params.groupBy === "agency"
        ? useCase.agency.name
        : params.groupBy === "topic"
          ? useCase.normalizedTopicArea ?? "Unknown"
          : useCase.normalizedClassification ?? "Unknown";
    const group =
      groups.get(label) ??
      {
        label,
        adoptionScores: [],
        governanceScores: [],
        riskScores: [],
        activeSystems: 0,
        highImpactSystems: 0
      };

    group.adoptionScores.push(adoptionScoreFor(useCase));
    group.governanceScores.push(governanceScoreFor(useCase));
    group.riskScores.push(riskScoreFor(useCase));
    group.activeSystems += useCase.activeSystemBoolean ? 1 : 0;
    group.highImpactSystems += useCase.highImpactBoolean ? 1 : 0;
    groups.set(label, group);
  }

  const data = [...groups.values()]
    .map<AdoptionGovernanceMatrixRow>((group) => {
      const adoptionScore = round(average(group.adoptionScores), 1);
      const governanceScore = round(average(group.governanceScores), 1);

      return {
        label: group.label,
        adoptionScore,
        governanceScore,
        activeSystems: group.activeSystems,
        highImpactSystems: group.highImpactSystems,
        riskScore: round(average(group.riskScores), 1),
        quadrant: quadrantFor(adoptionScore, governanceScore)
      };
    })
    .sort(matrixPrioritySort)
    .slice(0, limit);

  return {
    componentType: "adoption_governance_matrix",
    title: `Adoption vs. governance readiness by ${matrixGroupLabel(params.groupBy)}`,
    subtitle:
      "Prioritizes groups where adoption is outpacing governance readiness. Scores are app-derived management signals from synthetic telemetry and inventory governance fields.",
    data,
    syntheticMetric: true,
    disclosure: SYNTHETIC_DISCLOSURE
  };
}

function matrixGroupLabel(groupBy: AdoptionGovernanceMatrixParams["groupBy"]) {
  const labels: Record<AdoptionGovernanceMatrixParams["groupBy"], string> = {
    agency: "agency",
    topic: "topic area",
    classification: "AI classification"
  };

  return labels[groupBy];
}

function matrixPrioritySort(
  left: AdoptionGovernanceMatrixRow,
  right: AdoptionGovernanceMatrixRow
) {
  const leftGap = left.adoptionScore - left.governanceScore;
  const rightGap = right.adoptionScore - right.governanceScore;
  const leftPriority = left.quadrant === "Govern Before Scaling" ? 1 : 0;
  const rightPriority = right.quadrant === "Govern Before Scaling" ? 1 : 0;

  return (
    rightPriority - leftPriority ||
    rightGap - leftGap ||
    right.riskScore - left.riskScore ||
    right.activeSystems - left.activeSystems ||
    right.highImpactSystems - left.highImpactSystems ||
    left.label.localeCompare(right.label)
  );
}

function quadrantFor(
  adoptionScore: number,
  governanceScore: number
): AdoptionGovernanceMatrixRow["quadrant"] {
  const highAdoption = adoptionScore >= 55;
  const highGovernance = governanceScore >= 55;

  if (highAdoption && highGovernance) {
    return "Scale Confidently";
  }

  if (highAdoption && !highGovernance) {
    return "Govern Before Scaling";
  }

  if (!highAdoption && highGovernance) {
    return "Ready to Expand";
  }

  return "Underdeveloped";
}

export function getFollowupSuggestions(params: FollowupSuggestionsParams): FollowupSuggestionsResult {
  const suggestionsByContext: Record<FollowupSuggestionsParams["context"], string[]> = {
    mission_control: [
      "Show deployed high-impact systems",
      "Break down by agency",
      "Show COTS adoption",
      "Show estimated spend trend",
      "Show adoption versus governance matrix"
    ],
    inventory: [
      "Filter to high-impact systems",
      "Show systems involving PII",
      "Compare by classification",
      "Search examples"
    ],
    risk: [
      "Show only critical systems",
      "Filter to PII systems",
      "Show missing ATO systems",
      "Group missing controls",
      "Generate executive risk memo"
    ],
    cots: [
      "Show top commercial products",
      "Show license bucket distribution",
      "Break down by agency",
      "Estimate COTS monthly spend"
    ],
    cost: [
      "Find savings opportunities",
      "Break down by agency",
      "Show cost by classification",
      "Compare cost versus governance readiness"
    ],
    matrix: [
      "Show agencies in Govern Before Scaling",
      "Show high-risk systems in this quadrant",
      "Compare by classification",
      "Generate recommended actions"
    ],
    search: [
      "Analyze selected agency",
      "Show governance risk",
      "Show similar systems",
      "Show cost estimates"
    ]
  };

  return {
    componentType: "followup_suggestions",
    suggestions: suggestionsWithFilterContext(suggestionsByContext[params.context], params.filters)
  };
}

function suggestionsWithFilterContext(suggestions: string[], filters?: UseCaseFilters) {
  if (!filters) {
    return suggestions;
  }

  const context = [
    filters.agency && `agency ${filters.agency}`,
    filters.topic && `topic ${filters.topic}`,
    filters.classification && `classification ${filters.classification}`,
    filters.highImpactOnly && "high-impact systems",
    filters.piiOnly && "PII systems",
    filters.deployedOnly && "deployed systems"
  ].filter(Boolean);

  if (context.length === 0) {
    return suggestions;
  }

  return suggestions.map((suggestion) => `${suggestion} for ${context.join(", ")}`);
}
