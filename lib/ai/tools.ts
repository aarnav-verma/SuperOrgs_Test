import { tool } from "ai";
import { z } from "zod";

import {
  getAdoptionGovernanceMatrix,
  getCotsAdoption,
  getCostIntelligence,
  getFollowupSuggestions,
  getInventoryBreakdown,
  getMissionControlSnapshot,
  getRiskCommandCenter,
  searchUseCases
} from "@/lib/analytics/queries";

const limitSchema = z.number().int().min(1).max(100).optional();

const useCaseFiltersSchema = z
  .object({
    agency: z.string().trim().min(1).optional(),
    stage: z.string().trim().min(1).optional(),
    topic: z.string().trim().min(1).optional(),
    classification: z.string().trim().min(1).optional(),
    highImpactOnly: z.boolean().optional(),
    piiOnly: z.boolean().optional(),
    deployedOnly: z.boolean().optional()
  })
  .strict();

const missionFiltersSchema = z
  .object({
    agency: z.string().trim().min(1).optional(),
    topic: z.string().trim().min(1).optional(),
    classification: z.string().trim().min(1).optional()
  })
  .strict();

function withColumns<T extends object>(payload: T, columns: string[]) {
  return {
    ...payload,
    columns
  };
}

export const federalAiMissionControlTools = {
  getMissionControlSnapshot: tool({
    description:
      "Primary overview tool. Use when the user asks for an executive briefing, board update, mission control, portfolio overview, total systems, active systems, high-impact count, PII exposure, ATO coverage, governance readiness, average risk, or current estimated run-rate. Returns KPI cards, key findings, risks, recommended actions, systems by stage, and top agencies by high-impact systems. If the user asks for an additional ranking or distribution, call getInventoryBreakdown as a second tool.",
    inputSchema: z
      .object({
        filters: missionFiltersSchema.optional()
      })
      .strict(),
    execute: async ({ filters }) => getMissionControlSnapshot(filters)
  }),

  getInventoryBreakdown: tool({
    description:
      "Use for numeric rankings, distributions, concentration analysis, and comparisons by agency, bureau, development stage, topic area, or AI classification. Choose dimension agency for 'which agencies'; stage for development-stage mix; topic for topic-area mix; classification for AI type mix; bureau for bureau-level detail. Choose metric high_impact for high-impact rankings, systems for total inventory, active_systems for deployed/pilot activity, pii for PII exposure, ato_coverage for ATO coverage, avg_risk for app-derived risk score, and avg_governance for governance readiness. Do not use this for row-level review queues; use getRiskCommandCenter instead.",
    inputSchema: z
      .object({
        dimension: z.enum(["agency", "stage", "topic", "classification", "bureau"]),
        metric: z.enum([
          "systems",
          "active_systems",
          "high_impact",
          "pii",
          "ato_coverage",
          "avg_risk",
          "avg_governance"
        ]),
        filters: useCaseFiltersSchema.optional(),
        limit: limitSchema
      })
      .strict(),
    execute: async (params) =>
      withColumns(await getInventoryBreakdown(params), [
        "Segment",
        "Systems",
        "Active",
        "High-impact",
        "PII",
        "ATO coverage",
        "Risk",
        "Governance"
      ])
  }),

  getRiskCommandCenter: tool({
    description:
      "Use for row-level governance review queues and risk triage. Best for deployed high-impact systems needing review, PII systems, missing or unknown ATO, missing or not reported high-impact controls, risk drivers, governance score, risk score, or risk tier. For 'deployed high-impact systems need governance review', set highImpactOnly true, deployedOnly true, sortBy risk_score. For PII review, set piiOnly true. Use cautious language: needs review or not reported, not non-compliant. Do not use this for aggregate agency rankings unless the user asks for specific systems.",
    inputSchema: z
      .object({
        agency: z.string().trim().min(1).optional(),
        highImpactOnly: z.boolean().optional(),
        deployedOnly: z.boolean().optional(),
        piiOnly: z.boolean().optional(),
        riskTier: z.string().trim().min(1).optional(),
        sortBy: z.enum(["risk_score", "governance_score", "missing_controls"]).optional(),
        limit: limitSchema
      })
      .strict(),
    execute: async (params) =>
      withColumns(await getRiskCommandCenter(params), [
        "System",
        "Agency",
        "Stage",
        "Classification",
        "Topic",
        "PII",
        "ATO",
        "Risk tier",
        "Risk score",
        "Governance score",
        "Missing controls",
        "Risk drivers"
      ])
  }),

  getCotsAdoption: tool({
    description:
      "Use for the consolidated COTS AI use case file and SuperOrgs-style commercial AI tool visibility. Best for COTS adoption, commercial products, ChatGPT, Claude, Copilot, Gemini, license exposure, license buckets, common AI tasks, tool sprawl, shadow AI, and agency-level commercial AI exposure. Use view by_agency for 'Show COTS AI adoption by agency' and 'Which agencies have the broadest commercial AI tool exposure'. Use by_product for 'What commercial AI products are most common'. Use by_use_case for 'Which common AI tasks are most adopted'. Use license_buckets for 'Show license bucket distribution'. Use overview for an executive COTS summary. License exposure and spend are synthetic estimates.",
    inputSchema: z
      .object({
        view: z.enum(["overview", "by_agency", "by_use_case", "by_product", "license_buckets"]),
        agency: z.string().trim().min(1).optional(),
        limit: limitSchema
      })
      .strict(),
    execute: async (params) =>
      withColumns(await getCotsAdoption(params), [
        "Agency",
        "COTS use case",
        "Agency use",
        "Products",
        "License bucket",
        "Estimated license midpoint",
        "Estimated monthly spend"
      ])
  }),

  getCostIntelligence: tool({
    description:
      "Use for deterministic synthetic cost and ROI analysis. Best for estimated monthly spend, spend trend, annualized run-rate, task volume, utilization, hours saved, value created, ROI, savings opportunities, high-cost low-utilization systems, and cost optimization. Use view trend for 'How has estimated AI spend trended over the last year'. Use by_agency for 'Compare estimated cost and governance readiness by agency'. Use by_classification for cost by AI type. Use savings_opportunities for 'Where can we optimize AI spend' and 'Which systems are high-cost and low-utilization'. Use roi for value-created or ROI trend. Always treat outputs as synthetic estimates derived from real inventory attributes.",
    inputSchema: z
      .object({
        view: z.enum(["trend", "by_agency", "by_classification", "savings_opportunities", "roi"]),
        agency: z.string().trim().min(1).optional(),
        classification: z.string().trim().min(1).optional(),
        limit: limitSchema
      })
      .strict(),
    execute: async (params) =>
      withColumns(await getCostIntelligence(params), [
        "System",
        "Agency",
        "Stage",
        "Classification",
        "Monthly cost estimate",
        "Utilization score",
        "Cost per task",
        "Governance score",
        "Why flagged",
        "Estimated monthly savings"
      ])
  }),

  searchUseCases: tool({
    description:
      "Use for finding examples or specific AI systems. Best for queries starting with find, show examples, systems related to, what does an agency use a technology for, generative AI systems involving PII, law enforcement examples, benefits processing examples, or high-impact computer vision systems. Search covers system name, problem solved, benefits, outputs, agency, bureau, topic, and classification. Use piiOnly, highImpactOnly, deployedOnly, agency, topic, and classification filters when the user states them.",
    inputSchema: z
      .object({
        query: z.string().trim().min(1).optional(),
        agency: z.string().trim().min(1).optional(),
        topic: z.string().trim().min(1).optional(),
        classification: z.string().trim().min(1).optional(),
        highImpactOnly: z.boolean().optional(),
        piiOnly: z.boolean().optional(),
        deployedOnly: z.boolean().optional(),
        limit: limitSchema
      })
      .strict(),
    execute: async (params) =>
      withColumns(await searchUseCases(params), [
        "System",
        "Agency",
        "Bureau",
        "Stage",
        "Classification",
        "Topic",
        "High-impact",
        "PII",
        "ATO",
        "Snippet"
      ])
  }),

  getAdoptionGovernanceMatrix: tool({
    description:
      "Use for adoption versus governance readiness, maturity, scale readiness, adoption outpacing governance, governance lag, or where to scale next. Returns quadrant analysis: Scale Confidently, Govern Before Scaling, Ready to Expand, and Underdeveloped. Use groupBy agency by default for broad management questions, groupBy topic for mission-area readiness, and groupBy classification for AI technology readiness.",
    inputSchema: z
      .object({
        groupBy: z.enum(["agency", "topic", "classification"]),
        limit: limitSchema
      })
      .strict(),
    execute: async (params) =>
      withColumns(await getAdoptionGovernanceMatrix(params), [
        "Label",
        "Adoption score",
        "Governance score",
        "Active systems",
        "High-impact systems",
        "Average risk score",
        "Quadrant"
      ])
  }),

  getFollowupSuggestions: tool({
    description:
      "Use after every substantial analytical answer to produce follow-up chips. Match context to the main tool: mission_control for overview, inventory for breakdowns, risk for governance review, cots for commercial AI/tool sprawl, cost for spend/ROI, search for examples, and matrix for adoption-versus-governance readiness.",
    inputSchema: z
      .object({
        context: z.enum(["mission_control", "inventory", "risk", "cots", "cost", "search", "matrix"]),
        filters: useCaseFiltersSchema.optional()
      })
      .strict(),
    execute: async (params) => getFollowupSuggestions(params)
  })
};

export type FederalAiMissionControlTools = typeof federalAiMissionControlTools;
