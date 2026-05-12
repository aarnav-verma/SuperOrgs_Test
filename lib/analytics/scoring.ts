export type ScoringUseCase = {
  id?: string;
  agencyId?: string;
  normalizedStage?: string | null;
  normalizedTopicArea?: string | null;
  normalizedClassification?: string | null;
  highImpactBoolean?: boolean | null;
  piiBoolean?: boolean | null;
  atoBoolean?: boolean | null;
  piaUrl?: string | null;
  customCodeBoolean?: boolean | null;
  codeUrl?: string | null;
};

export type ScoringGovernanceControl = {
  completionRate?: number | null;
  governanceScore?: number | null;
  hiTestingConducted?: string | null;
  hiAssessmentCompleted?: string | null;
  hiIndependentReview?: string | null;
  hiOngoingMonitoring?: string | null;
  hiTrainingEstablished?: string | null;
  hiFailsafePresence?: string | null;
  hiAppealProcess?: string | null;
  hiPublicConsultationJson?: unknown;
};

export type RiskTier = "Low" | "Medium" | "High" | "Critical";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

const HIGH_IMPACT_CONTROL_LABELS: Array<{
  key: keyof ScoringGovernanceControl;
  label: string;
}> = [
  { key: "hiTestingConducted", label: "Testing conducted" },
  { key: "hiAssessmentCompleted", label: "Assessment completed" },
  { key: "hiIndependentReview", label: "Independent review" },
  { key: "hiOngoingMonitoring", label: "Ongoing monitoring" },
  { key: "hiTrainingEstablished", label: "Training established" },
  { key: "hiFailsafePresence", label: "Failsafe presence" },
  { key: "hiAppealProcess", label: "Appeal process" },
  { key: "hiPublicConsultationJson", label: "Public consultation" }
];

const SENSITIVE_TOPICS = [
  "law enforcement",
  "benefits processing",
  "health and medical",
  "hr",
  "cybersecurity"
];

const GOVERNANCE_SENSITIVE_CLASSIFICATIONS = [
  "agentic ai",
  "generative ai",
  "computer vision"
];

export function seededRandom(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 4294967295;
}

function stageKey(useCase: ScoringUseCase) {
  return useCase.normalizedStage ?? "Unknown";
}

function topicKey(useCase: ScoringUseCase) {
  return useCase.normalizedTopicArea ?? "Unknown";
}

function classificationKey(useCase: ScoringUseCase) {
  return useCase.normalizedClassification ?? "Unknown";
}

function normalizedLower(value: unknown) {
  return value == null ? "" : String(value).trim().toLowerCase();
}

function isActiveGovernanceStage(useCase: ScoringUseCase) {
  return ["Deployed", "Pilot"].includes(stageKey(useCase));
}

function hasEvidence(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasEvidence);
  }

  if (value && typeof value === "object") {
    return Object.keys(value).length > 0;
  }

  const normalized = normalizedLower(value);
  if (!normalized) {
    return false;
  }

  if (
    [
      "no",
      "n",
      "false",
      "unknown",
      "in progress",
      "not reported",
      "not applicable",
      "n/a",
      "na",
      "blank",
      "none",
      "null",
      "waived"
    ].includes(normalized)
  ) {
    return false;
  }

  if (
    normalized.includes("not reported") ||
    normalized.includes("unknown") ||
    normalized.includes("in progress") ||
    normalized.includes("not yet") ||
    normalized.includes("not conducted") ||
    normalized.includes("not completed")
  ) {
    return false;
  }

  return true;
}

function hasUrl(value: unknown) {
  const normalized = normalizedLower(value);
  return normalized.startsWith("http://") || normalized.startsWith("https://");
}

function isSensitiveTopic(useCase: ScoringUseCase) {
  const topic = topicKey(useCase).toLowerCase();
  return SENSITIVE_TOPICS.some((sensitiveTopic) => topic.includes(sensitiveTopic));
}

function isGovernanceSensitiveClassification(useCase: ScoringUseCase) {
  const classification = classificationKey(useCase).toLowerCase();
  return GOVERNANCE_SENSITIVE_CLASSIFICATIONS.some((sensitiveClassification) =>
    classification.includes(sensitiveClassification)
  );
}

export function computeMissingGovernanceControls(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null
): string[] {
  if (!useCase.highImpactBoolean) {
    return [];
  }

  return HIGH_IMPACT_CONTROL_LABELS.filter(({ key }) => !hasEvidence(governanceControl?.[key])).map(
    ({ label }) => label
  );
}

export function computeGovernanceCompletionRate(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null
): number {
  if (useCase.highImpactBoolean) {
    const completedControls = HIGH_IMPACT_CONTROL_LABELS.filter(({ key }) =>
      hasEvidence(governanceControl?.[key])
    ).length;

    return Math.round((completedControls / HIGH_IMPACT_CONTROL_LABELS.length) * 100) / 100;
  }

  const controls = [
    useCase.atoBoolean === true,
    useCase.piiBoolean === true ? hasUrl(useCase.piaUrl) : true,
    useCase.customCodeBoolean === true ? hasUrl(useCase.codeUrl) : true
  ];
  const completedControls = controls.filter(Boolean).length;

  return Math.round((completedControls / controls.length) * 100) / 100;
}

export function computeRiskDrivers(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null
): string[] {
  const drivers: string[] = [];

  if (useCase.highImpactBoolean) {
    drivers.push("High-impact system");
  }

  if (useCase.piiBoolean === true) {
    drivers.push("Involves PII");
  }

  if (isActiveGovernanceStage(useCase) && useCase.atoBoolean !== true) {
    drivers.push("Missing or unknown ATO");
  }

  if (useCase.piiBoolean === true && !hasUrl(useCase.piaUrl)) {
    drivers.push("PII without PIA URL");
  }

  if (useCase.customCodeBoolean === true && !hasUrl(useCase.codeUrl)) {
    drivers.push("Custom code without code URL");
  }

  if (isSensitiveTopic(useCase)) {
    drivers.push("Sensitive topic");
  }

  if (isGovernanceSensitiveClassification(useCase)) {
    drivers.push("Model governance-sensitive classification");
  }

  if (computeMissingGovernanceControls(useCase, governanceControl).length > 0) {
    drivers.push("Missing high-impact controls");
  }

  return drivers;
}

export function computeRiskScore(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null
): number {
  let score = 10;

  if (useCase.highImpactBoolean) {
    score += 25;
  }

  if (useCase.piiBoolean === true) {
    score += 15;
  }

  if (isActiveGovernanceStage(useCase) && useCase.atoBoolean !== true) {
    score += 12;
  }

  if (useCase.piiBoolean === true && !hasUrl(useCase.piaUrl)) {
    score += 10;
  }

  if (useCase.customCodeBoolean === true && !hasUrl(useCase.codeUrl)) {
    score += 7;
  }

  if (isSensitiveTopic(useCase)) {
    score += 8;
  }

  if (isGovernanceSensitiveClassification(useCase)) {
    score += 8;
  }

  if (useCase.highImpactBoolean) {
    score += computeMissingGovernanceControls(useCase, governanceControl).length * 3;
  }

  return Math.round(clamp(score));
}

export function computeRiskTier(score: number): RiskTier {
  if (score >= 80) {
    return "Critical";
  }

  if (score >= 60) {
    return "High";
  }

  if (score >= 40) {
    return "Medium";
  }

  return "Low";
}

export function computeGovernanceScore(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null
): number {
  const completionRate = computeGovernanceCompletionRate(useCase, governanceControl);
  let score = useCase.highImpactBoolean ? completionRate * 72 + 18 : completionRate * 64 + 26;

  if (isActiveGovernanceStage(useCase) && useCase.atoBoolean !== true) {
    score -= 16;
  }

  if (useCase.piiBoolean === true && !hasUrl(useCase.piaUrl)) {
    score -= 12;
  }

  if (useCase.customCodeBoolean === true && !hasUrl(useCase.codeUrl)) {
    score -= 8;
  }

  if (useCase.highImpactBoolean && computeMissingGovernanceControls(useCase, governanceControl).length > 0) {
    score -= 8;
  }

  return Math.round(clamp(score));
}

export function computeAdoptionScore(useCase: ScoringUseCase): number {
  const base =
    stageKey(useCase) === "Deployed"
      ? 76
      : stageKey(useCase) === "Pilot"
        ? 52
        : stageKey(useCase) === "Pre-deployment"
          ? 24
          : stageKey(useCase) === "Retired"
            ? 8
            : 18;
  const classificationBonus = isGovernanceSensitiveClassification(useCase) ? 6 : 0;
  const piiDrag = useCase.piiBoolean === true ? -4 : 0;

  return Math.round(clamp(base + classificationBonus + piiDrag));
}

function stageUsageBase(useCase: ScoringUseCase) {
  switch (stageKey(useCase)) {
    case "Deployed":
      return 2600;
    case "Pilot":
      return 650;
    case "Pre-deployment":
      return 80;
    case "Retired":
      return 220;
    default:
      return 180;
  }
}

function classificationCostMultiplier(useCase: ScoringUseCase) {
  const classification = classificationKey(useCase).toLowerCase();

  if (classification.includes("generative")) {
    return 2.35;
  }

  if (classification.includes("agentic")) {
    return 2.65;
  }

  if (classification.includes("computer vision")) {
    return 1.65;
  }

  if (classification.includes("nlp")) {
    return 1.35;
  }

  if (classification.includes("classical")) {
    return 0.82;
  }

  return 1;
}

function classificationGrowthMultiplier(useCase: ScoringUseCase) {
  const classification = classificationKey(useCase).toLowerCase();

  if (classification.includes("generative") || classification.includes("agentic")) {
    return 1.08;
  }

  if (classification.includes("nlp")) {
    return 1.04;
  }

  if (classification.includes("computer vision")) {
    return 1.02;
  }

  if (classification.includes("classical")) {
    return 0.98;
  }

  return 1;
}

function agencyGrowthMultiplier(useCase: ScoringUseCase) {
  const agencySeed = seededRandom(`agency-growth:${useCase.agencyId ?? "unknown"}`);
  return 0.88 + agencySeed * 0.42;
}

function monthlyGrowth(useCase: ScoringUseCase, monthIndex: number) {
  if (stageKey(useCase) === "Retired") {
    return Math.max(0.05, 1 - monthIndex * 0.085);
  }

  if (stageKey(useCase) === "Pre-deployment") {
    return 0.35 + monthIndex * 0.025;
  }

  const agencyGrowth = agencyGrowthMultiplier(useCase);
  const classificationGrowth = classificationGrowthMultiplier(useCase);
  const baseGrowth = 1 + monthIndex * 0.035 * agencyGrowth * classificationGrowth;

  return baseGrowth;
}

export function estimateTaskVolume(useCase: ScoringUseCase, monthIndex: number): number {
  const randomFactor = 0.82 + seededRandom(`${useCase.id}:tasks:${monthIndex}`) * 0.36;
  const highImpactFactor = useCase.highImpactBoolean ? 0.88 : 1;
  const value = stageUsageBase(useCase) * monthlyGrowth(useCase, monthIndex) * randomFactor * highImpactFactor;

  return Math.max(0, Math.round(value));
}

export function estimateActiveUsers(useCase: ScoringUseCase, monthIndex: number): number {
  const taskVolume = estimateTaskVolume(useCase, monthIndex);
  const stageDivisor = stageKey(useCase) === "Deployed" ? 38 : stageKey(useCase) === "Pilot" ? 24 : 16;
  const randomFactor = 0.8 + seededRandom(`${useCase.id}:users:${monthIndex}`) * 0.4;

  return Math.max(0, Math.round((taskVolume / stageDivisor) * randomFactor));
}

export function estimateMonthlyCost(
  useCase: ScoringUseCase,
  _governanceControl: ScoringGovernanceControl | null,
  monthIndex: number
): number {
  const taskVolume = estimateTaskVolume(useCase, monthIndex);
  const baseCostPerTask = 0.18 + seededRandom(`${useCase.id}:unit-cost`) * 0.52;
  const highImpactOverhead = useCase.highImpactBoolean ? 1.22 : 1;
  const piiOverhead = useCase.piiBoolean ? 1.16 : 1;
  const monthlyFixedCost = stageKey(useCase) === "Deployed" ? 450 : stageKey(useCase) === "Pilot" ? 180 : 45;
  const value =
    taskVolume *
      baseCostPerTask *
      classificationCostMultiplier(useCase) *
      highImpactOverhead *
      piiOverhead +
    monthlyFixedCost;

  return Math.round(value * 100) / 100;
}

export function estimateHoursSaved(_useCase: ScoringUseCase, taskVolume: number): number {
  return Math.round(taskVolume * 0.18 * 10) / 10;
}

export function estimateValueCreated(hoursSaved: number): number {
  return Math.round(hoursSaved * 87 * 100) / 100;
}

export function estimateUtilizationScore(
  useCase: ScoringUseCase,
  taskVolume: number,
  cost: number
): number {
  if (cost <= 0) {
    return 0;
  }

  const efficiency = taskVolume / cost;
  const stageBonus = stageKey(useCase) === "Deployed" ? 18 : stageKey(useCase) === "Pilot" ? 9 : 0;

  return Math.round(clamp(efficiency * 12 + stageBonus));
}

export function estimateAdoptionScore(useCase: ScoringUseCase, monthIndex: number): number {
  const stageBase =
    stageKey(useCase) === "Deployed"
      ? 66
      : stageKey(useCase) === "Pilot"
        ? 42
        : stageKey(useCase) === "Pre-deployment"
          ? 18
          : 8;
  const growth = monthIndex * agencyGrowthMultiplier(useCase) * classificationGrowthMultiplier(useCase) * 2.4;

  return Math.round(clamp(stageBase + growth));
}

export function estimateGovernanceScore(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null,
  monthIndex: number
): number {
  const reportedBase = computeGovernanceScore(useCase, governanceControl);
  const slowImprovement = monthIndex * (useCase.highImpactBoolean || useCase.piiBoolean ? 1.35 : 1.8);

  return Math.round(clamp(reportedBase + slowImprovement));
}

export function estimateRiskScore(
  useCase: ScoringUseCase,
  governanceControl: ScoringGovernanceControl | null,
  monthIndex: number
): number {
  const taskVolume = estimateTaskVolume(useCase, monthIndex);
  const adoptionScore = estimateAdoptionScore(useCase, monthIndex);
  const governanceScore = estimateGovernanceScore(useCase, governanceControl, monthIndex);
  const appDerivedBaseRisk = computeRiskScore(useCase, governanceControl);
  const adoptionPressure = adoptionScore * 0.34 + Math.min(18, taskVolume / 350);
  const governanceOffset = governanceScore * 0.42;

  return Math.round(clamp(appDerivedBaseRisk + adoptionPressure - governanceOffset));
}

export function riskTierFromScore(score: number): RiskTier {
  return computeRiskTier(score);
}
