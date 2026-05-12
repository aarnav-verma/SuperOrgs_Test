import { access } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import type { PrismaClient } from "@prisma/client";

import {
  computeGovernanceCompletionRate,
  computeGovernanceScore,
  computeMissingGovernanceControls,
  computeRiskDrivers,
  computeRiskScore,
  computeRiskTier,
  estimateActiveUsers,
  estimateAdoptionScore,
  estimateGovernanceScore,
  estimateHoursSaved,
  estimateMonthlyCost,
  estimateRiskScore,
  estimateTaskVolume,
  estimateUtilizationScore,
  estimateValueCreated
} from "../analytics/scoring";
import { readCsvFile } from "./csv";
import {
  emptyToNull,
  isActiveStage,
  isHighImpactExact,
  normalizeAgencyName,
  normalizeClassification,
  normalizeDevelopmentStage,
  normalizeTopicArea,
  normalizeWhitespace,
  parseBooleanish,
  parseOperationalDate,
  parsePythonListString
} from "./normalization";

export const INDIVIDUAL_USE_CASES_CSV_PATH = join(
  process.cwd(),
  "data/raw/2025_individually_reported_AI_use_cases.csv"
);

type ImportIndividualUseCasesOptions = {
  filePath?: string;
  clearExisting?: boolean;
};

export type IndividualUseCaseImportSummary = {
  agenciesImported: number;
  aiUseCasesImported: number;
  highImpactSystems: number;
  activeSystems: number;
  deployedSystems: number;
  pilotSystems: number;
  systemsInvolvingPii: number;
  systemsWithAto: number;
  monthlyMetricRowsGenerated: number;
  expectedMonthlyMetricRows: number;
  currentEstimatedMonthlyCost: number;
  estimatedAnnualizedRunRate: number;
  averageGovernanceScore: number;
  averageRiskScore: number;
  riskTierDistribution: {
    Low: number;
    Medium: number;
    High: number;
    Critical: number;
  };
  skippedRows: number;
  totalTimeMs: number;
};

type IndividualUseCaseRow = Record<string, string>;

function getField(row: IndividualUseCaseRow, column: string): string | null {
  return emptyToNull(row[column]);
}

function normalizedAgencyKey(name: string): string {
  return normalizeWhitespace(name).toLowerCase();
}

function requiredCsvMissingError(filePath: string) {
  return new Error(
    [
      "Missing required OMB individual AI use case CSV.",
      `Expected path: ${filePath}`,
      "Place 2025_individually_reported_AI_use_cases.csv in data/raw before running seed.",
      "The app must use local CSV files at runtime and should not fetch data during Docker review."
    ].join("\n")
  );
}

async function assertCsvExists(filePath: string) {
  try {
    await access(filePath);
  } catch {
    throw requiredCsvMissingError(filePath);
  }
}

function parseListJson(value: string | null): string[] | null {
  if (!value) {
    return null;
  }

  return parsePythonListString(value);
}

function normalizeGovernanceControlValue(value: string | null, highImpactBoolean: boolean) {
  if (value) {
    return value;
  }

  return highImpactBoolean ? "not reported" : null;
}

function getAgencyName(row: IndividualUseCaseRow) {
  return (
    normalizeAgencyName(getField(row, "agency_name")) ??
    normalizeAgencyName(getField(row, "agency")) ??
    "Unknown Agency"
  );
}

function getAgencyAbbreviation(row: IndividualUseCaseRow, agencyName: string) {
  const abbreviation = getField(row, "agency");
  if (!abbreviation) {
    return null;
  }

  return normalizeWhitespace(abbreviation) === agencyName ? null : abbreviation;
}

function shouldSkipRow(row: IndividualUseCaseRow) {
  return !getField(row, "use_case_name") && !getField(row, "id");
}

async function clearIndividualInventory(prisma: PrismaClient) {
  await prisma.governanceControl.deleteMany();
  await prisma.monthlyMetric.deleteMany();
  await prisma.aiUseCase.deleteMany();
}

function syntheticMonthForIndex(monthIndex: number) {
  return new Date(Date.UTC(2025, monthIndex, 1));
}

export async function importIndividualUseCases(
  prisma: PrismaClient,
  options: ImportIndividualUseCasesOptions = {}
): Promise<IndividualUseCaseImportSummary> {
  const startedAt = performance.now();
  const filePath = options.filePath ?? INDIVIDUAL_USE_CASES_CSV_PATH;
  await assertCsvExists(filePath);

  const rows = await readCsvFile(filePath);
  const clearExisting = options.clearExisting ?? true;
  if (clearExisting) {
    await clearIndividualInventory(prisma);
  }

  const agencyIdsByNormalizedName = new Map<string, string>();
  let agenciesImported = 0;
  let aiUseCasesImported = 0;
  let highImpactSystems = 0;
  let activeSystems = 0;
  let deployedSystems = 0;
  let pilotSystems = 0;
  let systemsInvolvingPii = 0;
  let systemsWithAto = 0;
  let monthlyMetricRowsGenerated = 0;
  let currentEstimatedMonthlyCost = 0;
  let latestGovernanceScoreTotal = 0;
  let latestRiskScoreTotal = 0;
  const riskTierDistribution = {
    Low: 0,
    Medium: 0,
    High: 0,
    Critical: 0
  };
  let skippedRows = 0;

  for (const row of rows) {
    if (shouldSkipRow(row)) {
      skippedRows += 1;
      continue;
    }

    const agencyName = getAgencyName(row);
    const agencyNormalizedName = normalizedAgencyKey(agencyName);
    let agencyId = agencyIdsByNormalizedName.get(agencyNormalizedName);

    if (!agencyId) {
      const agency = await prisma.agency.upsert({
        where: { normalizedName: agencyNormalizedName },
        update: {
          abbreviation: getAgencyAbbreviation(row, agencyName),
          name: agencyName
        },
        create: {
          abbreviation: getAgencyAbbreviation(row, agencyName),
          name: agencyName,
          normalizedName: agencyNormalizedName
        }
      });

      const resolvedAgencyId = agency.id as string;
      agencyId = resolvedAgencyId;
      agencyIdsByNormalizedName.set(agencyNormalizedName, resolvedAgencyId);
      agenciesImported += 1;
    }

    if (!agencyId) {
      throw new Error(`Could not resolve agency for row with agency name: ${agencyName}`);
    }

    const developmentStage = getField(row, "development_stage");
    const normalizedStage = normalizeDevelopmentStage(developmentStage);
    const highImpactValue = getField(row, "is_high_impact");
    const highImpactBoolean = isHighImpactExact(row.is_high_impact);
    const piiBoolean = parseBooleanish(getField(row, "has_pii"));
    const atoBoolean = parseBooleanish(getField(row, "have_ato"));
    const customCodeBoolean = parseBooleanish(getField(row, "has_custom_code"));
    const activeSystemBoolean = isActiveStage(normalizedStage);

    if (highImpactBoolean) {
      highImpactSystems += 1;
    }

    if (activeSystemBoolean) {
      activeSystems += 1;
    }

    if (normalizedStage === "Deployed") {
      deployedSystems += 1;
    }

    if (normalizedStage === "Pilot") {
      pilotSystems += 1;
    }

    if (piiBoolean === true) {
      systemsInvolvingPii += 1;
    }

    if (atoBoolean === true) {
      systemsWithAto += 1;
    }

    const aiUseCase = await prisma.aiUseCase.create({
      data: {
        ombId: getField(row, "id"),
        agencyId,
        useCaseName: getField(row, "use_case_name") ?? "Unnamed AI use case",
        agencyBureau: getField(row, "agency_bureau"),
        contactEmail: getField(row, "contact_email"),
        isWithheld: getField(row, "is_withheld"),
        developmentStage,
        normalizedStage,
        activeSystemBoolean,
        isHighImpact: highImpactValue,
        highImpactBoolean,
        highImpactJustification: getField(row, "HI_justification"),
        topicArea: getField(row, "topic_area"),
        normalizedTopicArea: normalizeTopicArea(getField(row, "topic_area")),
        classification: getField(row, "classification"),
        normalizedClassification: normalizeClassification(getField(row, "classification")),
        problemSolved: getField(row, "problem_solved"),
        benefits: getField(row, "benefits"),
        systemOutputs: getField(row, "system_outputs"),
        operationalDate: parseOperationalDate(getField(row, "operational_date")),
        contractingUsage: getField(row, "contracting_usage"),
        vendorName: getField(row, "vendor_name"),
        haveAto: getField(row, "have_ato"),
        atoBoolean,
        systemNameAto: getField(row, "system_name_ato"),
        dataDescription: getField(row, "data_description"),
        linkToData: getField(row, "link_to_data"),
        hasPii: getField(row, "has_pii"),
        piiBoolean,
        piaUrl: getField(row, "pia_url"),
        demographicFeaturesJson: parseListJson(getField(row, "demographic_features")) ?? undefined,
        hasCustomCode: getField(row, "has_custom_code"),
        customCodeBoolean,
        codeUrl: getField(row, "code_url"),
        rawJson: row
      }
    });

    const governanceControlInput = {
      aiUseCaseId: aiUseCase.id,
      hiTestingConducted: normalizeGovernanceControlValue(
        getField(row, "hi_testing_conducted"),
        highImpactBoolean
      ),
      hiAssessmentCompleted: normalizeGovernanceControlValue(
        getField(row, "hi_assessment_completed"),
        highImpactBoolean
      ),
      hiPotentialImpacts: normalizeGovernanceControlValue(
        getField(row, "hi_potential_impacts"),
        highImpactBoolean
      ),
      hiIndependentReview: normalizeGovernanceControlValue(
        getField(row, "hi_independent_review"),
        highImpactBoolean
      ),
      hiOngoingMonitoring: normalizeGovernanceControlValue(
        getField(row, "hi_ongoing_monitoring"),
        highImpactBoolean
      ),
      hiTrainingEstablished: normalizeGovernanceControlValue(
        getField(row, "hi_training_established"),
        highImpactBoolean
      ),
      hiFailsafePresence: normalizeGovernanceControlValue(
        getField(row, "hi_failsafe_presence"),
        highImpactBoolean
      ),
      hiAppealProcess: normalizeGovernanceControlValue(
        getField(row, "hi_appeal_process"),
        highImpactBoolean
      ),
      hiPublicConsultationJson: parseListJson(getField(row, "hi_public_consultation")) ?? undefined
    };
    const missingControls = computeMissingGovernanceControls(aiUseCase, governanceControlInput);
    const riskDrivers = computeRiskDrivers(aiUseCase, governanceControlInput);
    const completionRate = computeGovernanceCompletionRate(aiUseCase, governanceControlInput);
    const governanceScore = computeGovernanceScore(aiUseCase, governanceControlInput);
    const riskScore = computeRiskScore(aiUseCase, governanceControlInput);
    const riskTier = computeRiskTier(riskScore);
    riskTierDistribution[riskTier] += 1;

    const governanceControl = await prisma.governanceControl.create({
      data: {
        ...governanceControlInput,
        missingControlsJson: missingControls,
        riskDriversJson: riskDrivers,
        completionRate,
        governanceScore,
        riskScore,
        riskTier
      }
    });

    const monthlyMetrics = Array.from({ length: 12 }, (_, monthIndex) => {
      const taskVolume = estimateTaskVolume(aiUseCase, monthIndex);
      const estimatedMonthlyCost = estimateMonthlyCost(aiUseCase, governanceControl, monthIndex);
      const estimatedHoursSaved = estimateHoursSaved(aiUseCase, taskVolume);
      const governanceScore = estimateGovernanceScore(aiUseCase, governanceControl, monthIndex);
      const riskScore = estimateRiskScore(aiUseCase, governanceControl, monthIndex);

      return {
        aiUseCaseId: aiUseCase.id,
        month: syntheticMonthForIndex(monthIndex),
        estimatedMonthlyCost,
        estimatedActiveUsers: estimateActiveUsers(aiUseCase, monthIndex),
        taskVolume,
        estimatedHoursSaved,
        estimatedValueCreated: estimateValueCreated(estimatedHoursSaved),
        riskScore,
        governanceScore,
        utilizationScore: estimateUtilizationScore(aiUseCase, taskVolume, estimatedMonthlyCost),
        adoptionScore: estimateAdoptionScore(aiUseCase, monthIndex)
      };
    });

    await prisma.monthlyMetric.createMany({
      data: monthlyMetrics
    });

    const latestMetric = monthlyMetrics[monthlyMetrics.length - 1];
    currentEstimatedMonthlyCost += latestMetric.estimatedMonthlyCost;
    latestGovernanceScoreTotal += latestMetric.governanceScore;
    latestRiskScoreTotal += latestMetric.riskScore;
    monthlyMetricRowsGenerated += monthlyMetrics.length;

    aiUseCasesImported += 1;
  }

  const averageGovernanceScore =
    aiUseCasesImported > 0 ? latestGovernanceScoreTotal / aiUseCasesImported : 0;
  const averageRiskScore = aiUseCasesImported > 0 ? latestRiskScoreTotal / aiUseCasesImported : 0;
  const expectedMonthlyMetricRows = aiUseCasesImported * 12;

  if (monthlyMetricRowsGenerated !== expectedMonthlyMetricRows) {
    throw new Error(
      `MonthlyMetric row count mismatch. Generated ${monthlyMetricRowsGenerated}, expected ${expectedMonthlyMetricRows}.`
    );
  }

  return {
    agenciesImported,
    aiUseCasesImported,
    highImpactSystems,
    activeSystems,
    deployedSystems,
    pilotSystems,
    systemsInvolvingPii,
    systemsWithAto,
    monthlyMetricRowsGenerated,
    expectedMonthlyMetricRows,
    currentEstimatedMonthlyCost: Math.round(currentEstimatedMonthlyCost * 100) / 100,
    estimatedAnnualizedRunRate: Math.round(currentEstimatedMonthlyCost * 12 * 100) / 100,
    averageGovernanceScore: Math.round(averageGovernanceScore * 10) / 10,
    averageRiskScore: Math.round(averageRiskScore * 10) / 10,
    riskTierDistribution,
    skippedRows,
    totalTimeMs: Math.round(performance.now() - startedAt)
  };
}

export function formatIndividualImportSummary(summary: IndividualUseCaseImportSummary) {
  return [
    "Individual AI use case import complete",
    `agencies imported: ${summary.agenciesImported}`,
    `AI use cases imported: ${summary.aiUseCasesImported}`,
    `high-impact systems: ${summary.highImpactSystems}`,
    `active systems: ${summary.activeSystems}`,
    `deployed systems: ${summary.deployedSystems}`,
    `pilot systems: ${summary.pilotSystems}`,
    `systems involving PII: ${summary.systemsInvolvingPii}`,
    `systems with ATO: ${summary.systemsWithAto}`,
    `MonthlyMetric rows generated: ${summary.monthlyMetricRowsGenerated}`,
    `expected MonthlyMetric rows: ${summary.expectedMonthlyMetricRows}`,
    `current estimated monthly cost: ${summary.currentEstimatedMonthlyCost}`,
    `estimated annualized run-rate: ${summary.estimatedAnnualizedRunRate}`,
    `average governance score: ${summary.averageGovernanceScore}`,
    `average risk score: ${summary.averageRiskScore}`,
    `app-derived risk tier distribution: Low=${summary.riskTierDistribution.Low}, Medium=${summary.riskTierDistribution.Medium}, High=${summary.riskTierDistribution.High}, Critical=${summary.riskTierDistribution.Critical}`,
    "disclosure: synthetic deterministic enrichments, not official OMB-reported spend, usage, or ROI",
    `skipped rows: ${summary.skippedRows}`,
    `total time: ${summary.totalTimeMs}ms`
  ].join("\n");
}
