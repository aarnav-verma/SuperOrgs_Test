export type BiKpi = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "neutral" | "success" | "warning" | "critical";
  syntheticMetric?: boolean;
};

export type ChartDatum = {
  label: string;
  value: number;
  secondaryValue?: number;
  detail?: string;
};

export type UseCaseFilters = {
  agency?: string;
  stage?: string;
  topic?: string;
  classification?: string;
  highImpactOnly?: boolean;
  piiOnly?: boolean;
  deployedOnly?: boolean;
};

export type MissionControlSnapshot = {
  componentType: "mission_control";
  title: string;
  subtitle: string;
  kpis: BiKpi[];
  findings: string[];
  risks: string[];
  recommendedActions: string[];
  compositionChart: {
    title: string;
    data: ChartDatum[];
  };
  riskChart: {
    title: string;
    data: ChartDatum[];
  };
  syntheticMetric: true;
  disclosure: string;
};

export type InventoryBreakdownParams = {
  dimension: "agency" | "stage" | "topic" | "classification" | "bureau";
  metric:
    | "systems"
    | "active_systems"
    | "high_impact"
    | "pii"
    | "ato_coverage"
    | "avg_risk"
    | "avg_governance";
  filters?: UseCaseFilters;
  limit?: number;
};

export type InventoryBreakdownRow = {
  label: string;
  systems: number;
  activeSystems: number;
  highImpactSystems: number;
  piiSystems: number;
  atoCoverageRate: number;
  averageRiskScore: number;
  averageGovernanceScore: number;
  value: number;
};

export type InventoryBreakdownResult = {
  componentType: "breakdown";
  title: string;
  subtitle: string;
  chartType: "bar";
  data: ChartDatum[];
  rows: InventoryBreakdownRow[];
};

export type RiskCommandCenterParams = {
  agency?: string;
  highImpactOnly?: boolean;
  deployedOnly?: boolean;
  piiOnly?: boolean;
  riskTier?: string;
  sortBy?: "risk_score" | "governance_score" | "missing_controls";
  limit?: number;
};

export type GovernanceRiskRow = {
  useCaseName: string;
  agency: string;
  bureau: string | null;
  stage: string | null;
  topic: string | null;
  classification: string | null;
  highImpact: boolean;
  pii: boolean | null;
  ato: boolean | null;
  riskTier: string;
  riskScore: number;
  governanceScore: number;
  missingControls: string[];
  riskDrivers: string[];
};

export type RiskCommandCenterResult = {
  componentType: "risk_command_center";
  title: string;
  subtitle?: string;
  kpis: BiKpi[];
  rows: GovernanceRiskRow[];
};

export type CotsAdoptionParams = {
  view: "overview" | "by_agency" | "by_use_case" | "by_product" | "license_buckets";
  agency?: string;
  limit?: number;
};

export type CotsAdoptionRow = {
  label: string;
  agency?: string;
  useCase?: string;
  product?: string;
  agencyUse?: string | null;
  products?: string[];
  licenseBucket?: string | null;
  systems: number;
  yesRows: number;
  agencies: number;
  uniqueProducts: number;
  estimatedLicenseExposure: number;
  estimatedMonthlySpend: number;
  value: number;
};

export type CotsAdoptionResult = {
  componentType: "cots_adoption";
  title: string;
  subtitle?: string;
  kpis: BiKpi[];
  data: ChartDatum[];
  rows: CotsAdoptionRow[];
  note: string;
};

export type CostIntelligenceParams = {
  view: "trend" | "by_agency" | "by_classification" | "savings_opportunities" | "roi";
  agency?: string;
  classification?: string;
  limit?: number;
};

export type SavingsOpportunityRow = {
  useCaseName: string;
  agency: string;
  stage: string | null;
  classification: string | null;
  estimatedMonthlyCost: number;
  taskVolume: number;
  utilizationScore: number;
  governanceScore: number;
  riskScore: number;
  costPerTask: number;
  estimatedMonthlySavings: number;
  opportunity: string;
};

export type CostIntelligenceResult = {
  componentType: "cost_intelligence";
  title: string;
  subtitle?: string;
  chartType: "line" | "bar";
  kpis: BiKpi[];
  data: ChartDatum[];
  rows: SavingsOpportunityRow[];
  syntheticMetric: true;
  disclosure: string;
};

export type SearchUseCasesParams = UseCaseFilters & {
  query?: string;
  limit?: number;
};

export type UseCaseSearchRow = {
  useCaseName: string;
  agency: string;
  bureau: string | null;
  stage: string | null;
  topic: string | null;
  classification: string | null;
  highImpact: boolean;
  pii: boolean | null;
  ato: boolean | null;
  snippet: string;
};

export type UseCaseSearchResult = {
  componentType: "use_case_search";
  title: string;
  subtitle?: string;
  rows: UseCaseSearchRow[];
};

export type AdoptionGovernanceMatrixParams = {
  groupBy: "agency" | "topic" | "classification";
  limit?: number;
};

export type AdoptionGovernanceMatrixRow = {
  label: string;
  adoptionScore: number;
  governanceScore: number;
  activeSystems: number;
  highImpactSystems: number;
  riskScore: number;
  quadrant:
    | "Scale Confidently"
    | "Govern Before Scaling"
    | "Ready to Expand"
    | "Underdeveloped";
};

export type AdoptionGovernanceMatrixResult = {
  componentType: "adoption_governance_matrix";
  title: string;
  subtitle?: string;
  data: AdoptionGovernanceMatrixRow[];
  syntheticMetric?: true;
  disclosure?: string;
};

export type FollowupSuggestionsParams = {
  context: "mission_control" | "inventory" | "risk" | "cots" | "cost" | "search" | "matrix";
  filters?: UseCaseFilters;
};

export type FollowupSuggestionsResult = {
  componentType: "followup_suggestions";
  suggestions: string[];
};
