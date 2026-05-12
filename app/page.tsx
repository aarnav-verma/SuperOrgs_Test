import { BreakdownBarChart } from "@/components/bi/BreakdownBarChart";
import { CotsProductTable } from "@/components/bi/CotsProductTable";
import { ExecutiveBriefingCard } from "@/components/bi/ExecutiveBriefingCard";
import { FollowupChips } from "@/components/bi/FollowupChips";
import { GovernanceRiskTable } from "@/components/bi/GovernanceRiskTable";
import { KpiCardGrid } from "@/components/bi/KpiCardGrid";
import { TrendLineChart } from "@/components/bi/TrendLineChart";
import { ChatShell } from "@/components/chat/ChatShell";
import { DatasetBadge } from "@/components/common/DatasetBadge";
import { DisclosureBadge } from "@/components/common/DisclosureBadge";
import { ProviderBadge } from "@/components/common/ProviderBadge";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import {
  getCotsAdoption,
  getCostIntelligence,
  getInventoryBreakdown,
  getMissionControlSnapshot,
  getRiskCommandCenter
} from "@/lib/analytics/queries";
import { getAvailableProviders, getProviderName } from "@/lib/ai/provider";

const suggestedPrompts = [
  "Generate an executive briefing on the federal AI portfolio",
  "Which deployed high-impact systems need governance review?",
  "Show COTS AI adoption by agency",
  "Which agencies have the most high-impact AI systems?",
  "Where is adoption growing faster than governance readiness?",
  "How has estimated AI spend trended over the last year?",
  "Find generative AI systems involving PII"
];

const seedCommand = "docker compose up --build";

export const dynamic = "force-dynamic";

type DashboardState =
  | {
      status: "ready";
      snapshot: Awaited<ReturnType<typeof getMissionControlSnapshot>>;
      stageBreakdown: Awaited<ReturnType<typeof getInventoryBreakdown>>;
      highImpactByAgency: Awaited<ReturnType<typeof getInventoryBreakdown>>;
      classificationMix: Awaited<ReturnType<typeof getInventoryBreakdown>>;
      riskQueue: Awaited<ReturnType<typeof getRiskCommandCenter>>;
      cotsProducts: Awaited<ReturnType<typeof getCotsAdoption>>;
      costTrend: Awaited<ReturnType<typeof getCostIntelligence>>;
    }
  | {
      status: "setup";
      reason: string;
    };

async function loadDashboard(): Promise<DashboardState> {
  try {
    const [
      snapshot,
      stageBreakdown,
      highImpactByAgency,
      classificationMix,
      riskQueue,
      cotsProducts,
      costTrend
    ] = await Promise.all([
      getMissionControlSnapshot(),
      getInventoryBreakdown({ dimension: "stage", metric: "systems", limit: 10 }),
      getInventoryBreakdown({ dimension: "agency", metric: "high_impact", limit: 10 }),
      getInventoryBreakdown({ dimension: "classification", metric: "systems", limit: 10 }),
      getRiskCommandCenter({
        highImpactOnly: true,
        deployedOnly: true,
        limit: 10,
        sortBy: "risk_score"
      }),
      getCotsAdoption({ view: "by_product", limit: 10 }),
      getCostIntelligence({ view: "trend", limit: 12 })
    ]);

    if (stageBreakdown.rows.length === 0) {
      return {
        status: "setup",
        reason: "Run the seed command to import the OMB dataset"
      };
    }

    return {
      status: "ready",
      snapshot,
      stageBreakdown,
      highImpactByAgency,
      classificationMix,
      riskQueue,
      cotsProducts,
      costTrend
    };
  } catch (error) {
    return {
      status: "setup",
      reason:
        error instanceof Error && error.message
          ? `Run the seed command to import the OMB dataset. Database detail: ${error.message}`
          : "Run the seed command to import the OMB dataset"
    };
  }
}

function SetupState({ provider, reason }: { provider: string; reason: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <DatasetBadge />
          <DisclosureBadge />
          <ProviderBadge provider={provider} />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)]">
          Run the seed command to import the OMB dataset
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{reason}</p>
        <div className="mt-5 rounded-md border border-[var(--border)] bg-[var(--soft)] px-4 py-3 text-sm text-[var(--foreground)]">
          <code>{seedCommand}</code>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          The dashboard uses Postgres analytics tables populated from the two local OMB CSVs in
          data/raw. Cost, utilization, ROI, risk trend, and governance trend values are synthetic
          deterministic estimates.
        </p>
      </Card>
    </div>
  );
}

export default async function Home() {
  const provider = getProviderName();
  const availableProviders = getAvailableProviders();
  const dashboard = await loadDashboard();

  const modeLinks = [
    { anchor: "#mission-control", label: "Mission Control" },
    { anchor: "#inventory", label: "Inventory" },
    { anchor: "#governance-risk", label: "Governance risk" },
    { anchor: "#cots", label: "COTS adoption" },
    { anchor: "#cost-intelligence", label: "Cost intelligence" }
  ];

  return (
    <AppShell>
      {dashboard.status === "setup" ? (
        <SetupState provider={provider} reason={dashboard.reason} />
      ) : (
        <div className="min-h-screen">
          <header
            className="border-b border-[var(--border)] bg-[var(--panel)] px-5 py-4"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <DatasetBadge />
                  <DisclosureBadge />
                  <ProviderBadge provider={provider} />
                </div>
                <h1 className="mt-4 text-2xl font-semibold tracking-normal text-[var(--foreground)]">
                  Federal AI Mission Control
                </h1>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Chat-native BI for AI inventory, governance, COTS adoption, and cost intelligence
                </p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Use the mode links in the left rail or jump directly from this strip.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {modeLinks.map((link) => (
                  <a
                    className="rounded-full border border-[var(--border)] px-3 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                    href={link.anchor}
                    key={link.anchor}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </header>

          <section className="mx-auto max-w-7xl space-y-5 p-5" id="mission-control">
            <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Mission control
            </h2>
            <KpiCardGrid kpis={dashboard.snapshot.kpis} />

            <ExecutiveBriefingCard snapshot={dashboard.snapshot} />

            <ChatShell availableProviders={availableProviders} provider={provider} suggestedPrompts={suggestedPrompts} />
          </section>

          <section id="inventory" className="mx-auto max-w-7xl space-y-5 px-5 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Inventory intelligence
                </p>
                <h3 className="mt-1 text-lg font-semibold">Portfolio composition and mix</h3>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <BreakdownBarChart result={dashboard.stageBreakdown} />
              <BreakdownBarChart result={dashboard.highImpactByAgency} />
            </div>

            <BreakdownBarChart result={dashboard.classificationMix} />
          </section>

          <section id="governance-risk" className="mx-auto max-w-7xl space-y-5 px-5 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Governance risk
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  Prioritized systems and governance review queue
                </h3>
              </div>
            </div>
            <GovernanceRiskTable result={dashboard.riskQueue} />
          </section>

          <section id="cots" className="mx-auto max-w-7xl space-y-5 px-5 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  COTS adoption
                </p>
                <h3 className="mt-1 text-lg font-semibold">Commercial AI tool exposure</h3>
              </div>
            </div>
            <CotsProductTable result={dashboard.cotsProducts} />
          </section>

          <section id="cost-intelligence" className="mx-auto max-w-7xl space-y-5 px-5 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                  Cost intelligence
                </p>
                <h3 className="mt-1 text-lg font-semibold">Spend and utilization signals</h3>
              </div>
            </div>
            <KpiCardGrid kpis={dashboard.costTrend.kpis} />
            <TrendLineChart result={dashboard.costTrend} />
            <FollowupChips suggestions={suggestedPrompts} />
          </section>
        </div>
      )}
    </AppShell>
  );
}
