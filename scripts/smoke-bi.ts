import { prisma } from "../lib/db/prisma";
import {
  getAdoptionGovernanceMatrix,
  getCostIntelligence,
  getCotsAdoption,
  getInventoryBreakdown,
  getMissionControlSnapshot,
  getRiskCommandCenter,
  searchUseCases
} from "../lib/analytics/queries";

type SmokeResult = {
  name: string;
  summary: string;
};

function assertValid(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertArray(value: unknown, label: string): asserts value is unknown[] {
  assertValid(Array.isArray(value), `${label} must be an array`);
}

function firstLabel(rows: Array<{ label?: string; value?: number }>) {
  const first = rows[0];
  if (!first) {
    return "none";
  }

  return `${first.label ?? "unlabeled"}:${first.value ?? "n/a"}`;
}

async function runSmoke<T>(name: string, query: () => Promise<T>, validate: (result: T) => string) {
  const result = await query();
  const summary = validate(result);

  return { name, summary };
}

async function main() {
  await prisma.$connect();

  const results: SmokeResult[] = [];

  results.push(
    await runSmoke("getMissionControlSnapshot", () => getMissionControlSnapshot(), (result) => {
      assertValid(result.componentType === "mission_control", "mission control componentType mismatch");
      assertArray(result.kpis, "mission control kpis");
      assertArray(result.findings, "mission control findings");
      assertArray(result.risks, "mission control risks");
      assertArray(result.recommendedActions, "mission control recommendedActions");
      assertArray(result.compositionChart.data, "mission control compositionChart.data");
      assertArray(result.riskChart.data, "mission control riskChart.data");
      assertValid(typeof result.disclosure === "string", "mission control disclosure missing");

      return `kpis=${result.kpis.length}, stages=${result.compositionChart.data.length}, highImpactAgencies=${result.riskChart.data.length}`;
    })
  );

  results.push(
    await runSmoke(
      "getInventoryBreakdown agency high_impact",
      () => getInventoryBreakdown({ dimension: "agency", metric: "high_impact", limit: 10 }),
      (result) => {
        assertValid(result.componentType === "breakdown", "agency breakdown componentType mismatch");
        assertValid(result.chartType === "bar", "agency breakdown chartType mismatch");
        assertArray(result.data, "agency breakdown data");
        assertArray(result.rows, "agency breakdown rows");

        return `rows=${result.rows.length}, top=${firstLabel(result.rows)}`;
      }
    )
  );

  results.push(
    await runSmoke(
      "getInventoryBreakdown classification systems",
      () => getInventoryBreakdown({ dimension: "classification", metric: "systems", limit: 10 }),
      (result) => {
        assertValid(result.componentType === "breakdown", "classification breakdown componentType mismatch");
        assertValid(result.chartType === "bar", "classification breakdown chartType mismatch");
        assertArray(result.data, "classification breakdown data");
        assertArray(result.rows, "classification breakdown rows");

        return `rows=${result.rows.length}, top=${firstLabel(result.rows)}`;
      }
    )
  );

  results.push(
    await runSmoke(
      "getRiskCommandCenter deployed high-impact",
      () =>
        getRiskCommandCenter({
          highImpactOnly: true,
          deployedOnly: true,
          limit: 10,
          sortBy: "risk_score"
        }),
      (result) => {
        assertValid(result.componentType === "risk_command_center", "risk command center componentType mismatch");
        assertArray(result.kpis, "risk command center kpis");
        assertArray(result.rows, "risk command center rows");

        return `kpis=${result.kpis.length}, rows=${result.rows.length}`;
      }
    )
  );

  results.push(
    await runSmoke("getCotsAdoption by_agency", () => getCotsAdoption({ view: "by_agency", limit: 10 }), (result) => {
      assertValid(result.componentType === "cots_adoption", "COTS by agency componentType mismatch");
      assertArray(result.kpis, "COTS by agency kpis");
      assertArray(result.data, "COTS by agency data");
      assertArray(result.rows, "COTS by agency rows");
      assertValid(typeof result.note === "string", "COTS by agency note missing");
      assertValid(
        result.rows.some((row) => row.yesRows > 0),
        "COTS by agency must include agency-use Yes rows from the real COTS CSV"
      );
      assertValid(
        result.rows.some((row) => row.estimatedMonthlySpend > 0),
        "COTS by agency must include synthetic license spend estimates"
      );

      return `kpis=${result.kpis.length}, rows=${result.rows.length}, top=${firstLabel(result.rows)}`;
    })
  );

  results.push(
    await runSmoke("getCotsAdoption by_product", () => getCotsAdoption({ view: "by_product", limit: 10 }), (result) => {
      assertValid(result.componentType === "cots_adoption", "COTS by product componentType mismatch");
      assertArray(result.kpis, "COTS by product kpis");
      assertArray(result.data, "COTS by product data");
      assertArray(result.rows, "COTS by product rows");
      assertValid(typeof result.note === "string", "COTS by product note missing");
      assertValid(
        result.rows.some((row) => row.label !== "Unspecified product" && row.uniqueProducts > 0),
        "COTS by product must parse real commercial product names"
      );
      assertValid(
        result.rows.some((row) => row.estimatedMonthlySpend > 0),
        "COTS by product must include synthetic license spend estimates"
      );

      return `kpis=${result.kpis.length}, rows=${result.rows.length}, top=${firstLabel(result.rows)}`;
    })
  );

  results.push(
    await runSmoke("getCostIntelligence trend", () => getCostIntelligence({ view: "trend" }), (result) => {
      assertValid(result.componentType === "cost_intelligence", "cost trend componentType mismatch");
      assertArray(result.kpis, "cost trend kpis");
      assertArray(result.data, "cost trend data");
      assertArray(result.rows, "cost trend rows");
      assertValid(result.syntheticMetric === true, "cost trend syntheticMetric must be true");
      assertValid(typeof result.disclosure === "string", "cost trend disclosure missing");

      return `kpis=${result.kpis.length}, points=${result.data.length}`;
    })
  );

  results.push(
    await runSmoke(
      "getCostIntelligence savings_opportunities",
      () => getCostIntelligence({ view: "savings_opportunities", limit: 10 }),
      (result) => {
        assertValid(result.componentType === "cost_intelligence", "savings componentType mismatch");
        assertArray(result.kpis, "savings kpis");
        assertArray(result.data, "savings data");
        assertArray(result.rows, "savings rows");
        assertValid(result.syntheticMetric === true, "savings syntheticMetric must be true");
        assertValid(typeof result.disclosure === "string", "savings disclosure missing");

        return `kpis=${result.kpis.length}, rows=${result.rows.length}, chartRows=${result.data.length}`;
      }
    )
  );

  results.push(
    await runSmoke(
      "searchUseCases generative pii",
      () => searchUseCases({ query: "generative", piiOnly: true, limit: 10 }),
      (result) => {
        assertValid(result.componentType === "use_case_search", "search componentType mismatch");
        assertArray(result.rows, "search rows");

        return `rows=${result.rows.length}`;
      }
    )
  );

  results.push(
    await runSmoke(
      "getAdoptionGovernanceMatrix agency",
      () => getAdoptionGovernanceMatrix({ groupBy: "agency", limit: 10 }),
      (result) => {
        assertValid(result.componentType === "adoption_governance_matrix", "matrix componentType mismatch");
        assertArray(result.data, "matrix data");

        return `rows=${result.data.length}, top=${firstLabel(result.data.map((row) => ({ label: row.label, value: row.riskScore })))}`;
      }
    )
  );

  console.log("BI smoke passed");
  for (const result of results) {
    console.log(`- ${result.name}: ${result.summary}`);
  }
}

main()
  .catch((error) => {
    console.error("BI smoke failed");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
