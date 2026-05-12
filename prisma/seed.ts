import { access } from "node:fs/promises";

import {
  COTS_USE_CASES_CSV_PATH,
  formatCotsImportSummary,
  importCotsUseCases
} from "../lib/data/importCotsUseCases";
import {
  INDIVIDUAL_USE_CASES_CSV_PATH,
  formatIndividualImportSummary,
  importIndividualUseCases
} from "../lib/data/importIndividualUseCases";

async function assertRequiredSeedFilesExist() {
  const requiredFiles = [INDIVIDUAL_USE_CASES_CSV_PATH, COTS_USE_CASES_CSV_PATH];
  const missingFiles: string[] = [];

  for (const filePath of requiredFiles) {
    try {
      await access(filePath);
    } catch {
      missingFiles.push(filePath);
    }
  }

  if (missingFiles.length > 0) {
    throw new Error(
      [
        "Missing required OMB CSV seed files.",
        ...missingFiles.map((filePath) => `Expected path: ${filePath}`),
        "Place both raw CSV files in data/raw before running seed:",
        "- 2025_individually_reported_AI_use_cases.csv",
        "- 2025_consolidated_COTS_AI_use_cases.csv",
        "The Docker runtime must use local committed CSV files and should not fetch data from the internet."
      ].join("\n")
    );
  }
}

async function main() {
  await assertRequiredSeedFilesExist();

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const individualSummary = await importIndividualUseCases(prisma);
    console.log(formatIndividualImportSummary(individualSummary));

    const cotsSummary = await importCotsUseCases(prisma);
    console.log("");
    console.log(formatCotsImportSummary(cotsSummary));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
