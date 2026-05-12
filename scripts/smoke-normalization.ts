import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { readCsvFile } from "../lib/data/csv";
import {
  estimateLicenseMidpoint,
  isActiveStage,
  isHighImpactExact,
  normalizeAgencyName,
  normalizeDevelopmentStage,
  normalizeTopicArea,
  parseBooleanish,
  parsePythonListString,
  splitProductNames
} from "../lib/data/normalization";

async function main() {
  assert.equal(isHighImpactExact("High-impact"), true);
  assert.equal(isHighImpactExact(" High-impact "), false);
  assert.equal(isHighImpactExact("Not High-impact"), false);
  assert.equal(isHighImpactExact("Presumed High-Impact, but Not High-impact"), false);

  assert.equal(normalizeDevelopmentStage("production"), "Deployed");
  assert.equal(normalizeDevelopmentStage("planning"), "Pre-deployment");
  assert.equal(isActiveStage("Pilot"), true);
  assert.equal(isActiveStage("Retired"), false);

  assert.equal(normalizeTopicArea("Administrative functions"), "Admin Functions");
  assert.equal(normalizeTopicArea("Information Technology"), "IT");
  assert.equal(normalizeAgencyName("Department of Treasury"), "Department of the Treasury");
  assert.equal(
    normalizeAgencyName("Export-Import Bank of the U.S."),
    "Export-Import Bank of the United States"
  );

  assert.equal(parseBooleanish("Yes"), true);
  assert.equal(parseBooleanish("No"), false);
  assert.equal(parseBooleanish("Not Applicable"), null);
  assert.equal(estimateLicenseMidpoint("10,000-50,000"), 30000);
  assert.deepEqual(parsePythonListString("['NLP', 'Computer Vision']"), ["NLP", "Computer Vision"]);
  assert.deepEqual(splitProductNames("ChatGPT; Claude and Gemini"), ["ChatGPT", "Claude", "Gemini"]);

  const tempDir = await mkdtemp(join(tmpdir(), "faimc-csv-"));
  const csvPath = join(tempDir, "sample.csv");
  await writeFile(csvPath, "\uFEFFname,notes\nAgency,\"multi\nline, quoted cell\"\n", "utf8");

  const rows = await readCsvFile(csvPath);
  assert.deepEqual(rows, [{ name: "Agency", notes: "multi\nline, quoted cell" }]);

  await rm(tempDir, { recursive: true, force: true });
  console.log("normalization smoke checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
