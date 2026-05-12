import { access } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import type { PrismaClient } from "@prisma/client";

import { readCsvFile } from "./csv";
import {
  emptyToNull,
  estimateLicenseMidpoint,
  normalizeAgencyName,
  normalizeWhitespace,
  parseBooleanish,
  splitProductNames
} from "./normalization";

export const COTS_USE_CASES_CSV_PATH = join(
  process.cwd(),
  "data/raw/2025_consolidated_COTS_AI_use_cases.csv"
);

type ImportCotsUseCasesOptions = {
  filePath?: string;
  clearExisting?: boolean;
};

export type CotsUseCaseImportSummary = {
  cotsRowsImported: number;
  cotsYesRows: number;
  uniqueAgenciesInCots: number;
  uniqueProductNames: number;
  totalEstimatedCotsMonthlySpend: number;
  skippedRows: number;
  totalTimeMs: number;
};

type CotsUseCaseRow = Record<string, string>;

const AGENCY_COLUMNS = [
  "agency",
  "agency_name",
  "agency name",
  "department/agency",
  "department agency",
  "reporting agency",
  "federal agency"
];

const AI_USE_CASE_COLUMNS = [
  "use case",
  "ai use case",
  "ai_use_case",
  "ai usecase",
  "use_case",
  "use case name",
  "common ai use case",
  "cots ai use case"
];

const AGENCY_USE_COLUMNS = [
  "agency use",
  "agency_use",
  "agency use (y/n)?",
  "agency use y/n",
  "agency use y n",
  "agency use yn",
  "agency uses",
  "used by agency",
  "use by agency",
  "is agency using",
  "agency use?"
];

const PRODUCT_COLUMNS = [
  "name of commercial product or service used",
  "commercial product/service",
  "commercial product service",
  "commercial product or service",
  "commercial ai product/service",
  "commercial ai product service",
  "product/service",
  "product service",
  "commercial product",
  "product",
  "products",
  "vendor/product",
  "vendor product",
  "vendor name"
];

const LICENSE_COLUMNS = [
  "estimated # of licenses/users",
  "estimated number of licenses/users",
  "estimated licenses/users",
  "license/user bucket",
  "license user bucket",
  "licenses/users",
  "licenses users",
  "licenses/users bucket",
  "license/users bucket",
  "license bucket",
  "user bucket",
  "number of licenses/users",
  "license users"
];

function requiredCsvMissingError(filePath: string) {
  return new Error(
    [
      "Missing required OMB consolidated COTS AI use case CSV.",
      `Expected path: ${filePath}`,
      "Place 2025_consolidated_COTS_AI_use_cases.csv in data/raw before running seed.",
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

function canonicalColumnName(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function getField(row: CotsUseCaseRow, candidates: string[]): string | null {
  for (const candidate of candidates) {
    const direct = emptyToNull(row[candidate]);
    if (direct) {
      return direct;
    }
  }

  const canonicalCandidates = new Set(candidates.map(canonicalColumnName));
  const matchingKey = Object.keys(row).find((key) => canonicalCandidates.has(canonicalColumnName(key)));

  return matchingKey ? emptyToNull(row[matchingKey]) : null;
}

function normalizedAgencyKey(name: string): string {
  return normalizeWhitespace(name).toLowerCase();
}

function getAgencyName(row: CotsUseCaseRow) {
  return normalizeAgencyName(getField(row, ["agency_name", "agency name"])) ?? normalizeAgencyName(getField(row, AGENCY_COLUMNS));
}

function getAgencyAbbreviation(row: CotsUseCaseRow, agencyName: string) {
  const abbreviation = getField(row, ["agency"]);
  if (!abbreviation) {
    return null;
  }

  return normalizeWhitespace(abbreviation) === agencyName ? null : abbreviation;
}

function parseAgencyUseBoolean(value: string | null): boolean | null {
  const parsed = parseBooleanish(value);
  if (parsed != null) {
    return parsed;
  }

  const normalized = emptyToNull(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("yes") || normalized.includes("agency use: yes")) {
    return true;
  }

  if (normalized.startsWith("no") || normalized.includes("agency use: no")) {
    return false;
  }

  return null;
}

function shouldSkipRow(row: CotsUseCaseRow) {
  const fields = parseCotsUseCaseRow(row);

  return !fields.agencyName || (!fields.aiUseCase && !fields.agencyUse && !fields.productText);
}

async function clearCotsInventory(prisma: PrismaClient) {
  await prisma.cotsUseCase.deleteMany();
}

export function parseCotsUseCaseRow(row: CotsUseCaseRow) {
  const agencyName = getAgencyName(row);
  const agencyUse = getField(row, AGENCY_USE_COLUMNS);
  const productText = getField(row, PRODUCT_COLUMNS);
  const licenseBucket = getField(row, LICENSE_COLUMNS);
  const estimatedLicenseMidpoint = estimateLicenseMidpoint(licenseBucket);

  return {
    agencyName,
    agencyAbbreviation: agencyName ? getAgencyAbbreviation(row, agencyName) : null,
    aiUseCase: getField(row, AI_USE_CASE_COLUMNS),
    agencyUse,
    agencyUseBoolean: parseAgencyUseBoolean(agencyUse),
    productText,
    productNames: splitProductNames(productText),
    licenseBucket,
    estimatedLicenseMidpoint,
    estimatedMonthlySpend:
      estimatedLicenseMidpoint == null ? null : estimatedLicenseMidpoint * 20
  };
}

export async function importCotsUseCases(
  prisma: PrismaClient,
  options: ImportCotsUseCasesOptions = {}
): Promise<CotsUseCaseImportSummary> {
  const startedAt = performance.now();
  const filePath = options.filePath ?? COTS_USE_CASES_CSV_PATH;
  await assertCsvExists(filePath);

  const rows = await readCsvFile(filePath);
  const clearExisting = options.clearExisting ?? true;
  if (clearExisting) {
    await clearCotsInventory(prisma);
  }

  const agencyIdsByNormalizedName = new Map<string, string>();
  const agenciesInCots = new Set<string>();
  const uniqueProductNames = new Set<string>();
  let cotsRowsImported = 0;
  let cotsYesRows = 0;
  let totalEstimatedCotsMonthlySpend = 0;
  let skippedRows = 0;

  for (const row of rows) {
    if (shouldSkipRow(row)) {
      skippedRows += 1;
      continue;
    }

    const parsedRow = parseCotsUseCaseRow(row);
    const agencyName = parsedRow.agencyName;
    if (!agencyName) {
      skippedRows += 1;
      continue;
    }

    const agencyNormalizedName = normalizedAgencyKey(agencyName);
    let agencyId = agencyIdsByNormalizedName.get(agencyNormalizedName);

    if (!agencyId) {
      const agency = await prisma.agency.upsert({
        where: { normalizedName: agencyNormalizedName },
        update: {
          abbreviation: parsedRow.agencyAbbreviation,
          name: agencyName
        },
        create: {
          abbreviation: parsedRow.agencyAbbreviation,
          name: agencyName,
          normalizedName: agencyNormalizedName
        }
      });

      const resolvedAgencyId = agency.id as string;
      agencyId = resolvedAgencyId;
      agencyIdsByNormalizedName.set(agencyNormalizedName, resolvedAgencyId);
    }

    await prisma.cotsUseCase.create({
      data: {
        agencyId,
        aiUseCase: parsedRow.aiUseCase ?? "Unspecified COTS AI use case",
        agencyUse: parsedRow.agencyUse,
        agencyUseBoolean: parsedRow.agencyUseBoolean,
        productText: parsedRow.productText,
        productNamesJson: parsedRow.productNames,
        licenseBucket: parsedRow.licenseBucket,
        estimatedLicenseMidpoint: parsedRow.estimatedLicenseMidpoint,
        estimatedMonthlySpend: parsedRow.estimatedMonthlySpend,
        rawJson: row
      }
    });

    cotsRowsImported += 1;
    agenciesInCots.add(agencyNormalizedName);

    if (parsedRow.agencyUseBoolean === true) {
      cotsYesRows += 1;
    }

    for (const productName of parsedRow.productNames) {
      uniqueProductNames.add(productName.toLowerCase());
    }

    if (parsedRow.estimatedMonthlySpend != null) {
      totalEstimatedCotsMonthlySpend += parsedRow.estimatedMonthlySpend;
    }
  }

  return {
    cotsRowsImported,
    cotsYesRows,
    uniqueAgenciesInCots: agenciesInCots.size,
    uniqueProductNames: uniqueProductNames.size,
    totalEstimatedCotsMonthlySpend,
    skippedRows,
    totalTimeMs: Math.round(performance.now() - startedAt)
  };
}

export function formatCotsImportSummary(summary: CotsUseCaseImportSummary) {
  return [
    "Consolidated COTS AI use case import complete",
    `COTS rows imported: ${summary.cotsRowsImported}`,
    `COTS yes rows: ${summary.cotsYesRows}`,
    `unique agencies in COTS: ${summary.uniqueAgenciesInCots}`,
    `unique product names: ${summary.uniqueProductNames}`,
    `total estimated COTS monthly spend: ${Math.round(summary.totalEstimatedCotsMonthlySpend * 100) / 100}`,
    "disclosure: estimated COTS monthly spend is a synthetic estimate using $20 per estimated license per month",
    `skipped rows: ${summary.skippedRows}`,
    `total time: ${summary.totalTimeMs}ms`
  ].join("\n");
}
