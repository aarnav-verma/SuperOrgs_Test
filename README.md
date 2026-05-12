# Federal AI Mission Control

## 1. Project Overview

Federal AI Mission Control is a compact, chat-native BI product for the OMB 2025 Federal Agency AI Use Case Inventory.

It helps users analyze AI inventory, governance readiness, COTS adoption, estimated cost, utilization, ROI, and adoption planning from one executive-grade chat surface. The assistant answers natural-language questions with inline BI components: KPI cards, charts, tables, risk queues, search results, and follow-up chips.

## 2. Why This Dataset

The primary data source is the OMB 2025 Federal Agency AI Use Case Inventory.

- `2025_individually_reported_AI_use_cases.csv` powers AI inventory, agency/bureau analysis, development-stage analysis, topic and classification mix, high-impact review, PII exposure, ATO coverage, and governance readiness.
- `2025_consolidated_COTS_AI_use_cases.csv` powers COTS adoption, commercial product visibility, license bucket exposure, and agency-level AI tool sprawl analysis.

This maps well to a SuperOrgs-style workflow because the core problem is organizational AI visibility: leaders need to understand what AI systems exist, where adoption is accelerating, where governance is incomplete, which commercial tools are spreading, and where cost or utilization patterns need executive attention.

## 3. Data Disclosure

The OMB inventory and consolidated COTS records are real public data.

Monthly cost, usage, ROI, hours saved, utilization, risk trend, and governance trend metrics are deterministic synthetic enrichments generated from real inventory attributes such as development stage, high-impact status, PII involvement, ATO status, topic area, and AI classification.

The synthetic layer exists because real enterprise AI telemetry, spend, task volume, productivity, and utilization data is usually private. These estimates are useful for product demonstration and BI workflow design, but they are not official OMB-reported spend, usage, ROI, or risk scores.

## 4. Quick Start With Docker Only

Reviewer requirements:

- Docker
- OpenAI and/or Anthropic API key
- No local Node installation
- No local Postgres installation
- No hosted database

```sh
Create `.env` with the required values (see section 5) and add at least one provider API key.
docker compose up --build
```

The app runs at:

```text
http://localhost:3000
```

Required local CSV files:

```text
data/raw/2025_individually_reported_AI_use_cases.csv
data/raw/2025_consolidated_COTS_AI_use_cases.csv
```

These files should be committed with the submission so Docker does not need internet access at runtime.

Docker startup waits for Postgres, syncs the Prisma schema, seeds from `data/raw` when analytics tables are empty, and starts the Next.js server.

Manual commands:

```sh
docker compose ps
docker compose logs -f app
docker compose exec app npm run smoke:bi
```

For a clean startup after schema or data changes:

```sh
docker compose down -v
Create `.env` again if needed and add your provider key(s) again.
docker compose up --build
```

If the app starts but still fails on first question, confirm:

- `AI_PROVIDER` is `openai` or `anthropic`
- The matching API key is set in `.env`
- `OPENAI_MODEL`/`ANTHROPIC_MODEL` is valid

Docker startup and migration workflow:

```sh
docker compose exec app npm run db:deploy
docker compose exec app npm run db:push
docker compose exec app npm run db:seed
docker compose exec app npm run db:reset
docker compose exec app npm run smoke:bi
```

The container startup flow is:

1. wait for Postgres,
2. apply Prisma migrations from `prisma/migrations` with `prisma migrate deploy`,
3. seed local `data/raw` rows when analytics tables are empty.

Use `SEED_ON_START=false` to skip automatic seeding, or `SEED_ON_START=true` to force seed on startup.

## 5. Environment Variables

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/federal_ai_mission_control
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
DB_WAIT_TIMEOUT_MS=120000
```

- `DATABASE_URL`: Postgres connection string. In Docker this should use the `db` hostname.
- `AI_PROVIDER`: `openai` or `anthropic`.
- `OPENAI_API_KEY`: required when `AI_PROVIDER=openai`.
- `OPENAI_MODEL`: OpenAI model name.
- `ANTHROPIC_API_KEY`: required when `AI_PROVIDER=anthropic`.
- `ANTHROPIC_MODEL`: Anthropic model name.
- `DB_WAIT_TIMEOUT_MS`: optional startup timeout for app Postgres wait loop (default 120000ms). Increase this value on slower hosts.

## 6. Provider Switching

OpenAI:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
```

Anthropic:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

No code changes are required. Provider-specific logic is isolated in `lib/ai/provider.ts`.

## 7. Demo Queries

- Generate an executive briefing on the federal AI portfolio
- Which agencies have the most high-impact AI systems?
- Which deployed high-impact systems need governance review?
- Show COTS AI adoption by agency
- How has estimated AI spend trended over the last year?
- Where is adoption growing faster than governance readiness?
- Find generative AI systems involving PII

See `VIDEO_SCRIPT.md` for a concise review/demo walkthrough.

## 8. Architecture

- Next.js App Router for the UI and API routes
- TypeScript throughout the app
- Tailwind CSS and local shadcn-style primitives for compact enterprise UI
- Postgres in Docker for analytics data and chat persistence
- Prisma for schema, queries, and seed workflows
- Vercel AI SDK for streaming chat and typed tool calls
- Provider abstraction in `lib/ai/provider.ts`
- Typed tool definitions in `lib/ai/tools.ts`
- Safe BI query layer in `lib/analytics/queries.ts`
- Scoring and deterministic telemetry logic in `lib/analytics/scoring.ts`
- Inline BI rendering in `components/chat/ToolRenderer.tsx`
- Conversations and messages persisted in Postgres

The model never writes SQL. It can only call typed tools backed by safe query functions.

## 9. Tool Design

Tools:

- `getMissionControlSnapshot`: executive overview with KPIs, findings, risks, recommended actions, stage mix, and high-impact agency concentration.
- `getInventoryBreakdown`: rankings and distributions by agency, bureau, stage, topic, or classification.
- `getRiskCommandCenter`: prioritized governance review queue for high-impact, deployed, PII, missing ATO, and missing control scenarios.
- `getCotsAdoption`: COTS AI adoption, top commercial products, license buckets, and tool sprawl visibility.
- `getCostIntelligence`: synthetic spend trend, annualized run-rate, cost by agency/classification, ROI simulation, and savings opportunities.
- `searchUseCases`: row-level search across system name, problem solved, benefits, outputs, agency, bureau, topic, and classification.
- `getAdoptionGovernanceMatrix`: adoption versus governance readiness quadrants.
- `getFollowupSuggestions`: context-aware follow-up chips.

To add a new tool, a teammate would:

1. Add a typed query function in `lib/analytics/queries.ts`.
2. Add or extend result types in `lib/analytics/types.ts`.
3. Register the zod-validated tool in `lib/ai/tools.ts`.
4. Add rendering support in `components/chat/ToolRenderer.tsx`.

## 10. Streaming And Persistence

Assistant responses stream progressively through `/api/chat`.

The app persists:

- conversations
- user messages
- assistant messages
- streamed final assistant text
- tool result payloads

After reload, the selected conversation is loaded from Postgres. Historical tool results are rendered again through `ToolRenderer`, so prior KPI cards, charts, tables, and follow-up chips reappear rather than raw JSON.

## 11. Database Schema

- `Agency`: normalized agency identity shared by individual and COTS records.
- `AiUseCase`: individual OMB AI use case records, including stage, high-impact status, topic, classification, PII, ATO, vendor/code fields, and raw row JSON.
- `GovernanceControl`: high-impact governance fields, missing-control labels, risk drivers, app-derived governance score, risk score, and risk tier.
- `CotsUseCase`: consolidated COTS use case records, product text, parsed product names, license bucket, estimated license midpoint, and estimated monthly spend.
- `MonthlyMetric`: deterministic synthetic monthly cost, users, task volume, hours saved, value created, risk, governance, utilization, and adoption scores.
- `Conversation`: persisted chat thread metadata.
- `Message`: persisted user/assistant messages with optional parts and tool results.

## 12. AI Tools And Open-Source Libraries Used

AI coding tools, including Codex, were used to help scaffold and iterate on this project.

Major libraries:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Prisma
- Postgres
- Vercel AI SDK
- OpenAI AI SDK provider
- Anthropic AI SDK provider
- Recharts
- zod
- csv-parse
- tsx
- ESLint

## 13. Known Limitations

- Synthetic telemetry is deterministic demo data, not official OMB telemetry.
- No authentication.
- Single-user local review flow.
- Public dataset only.
- Risk scoring is app-derived prioritization, not an official OMB risk score or compliance determination.
- COTS product extraction is simple text parsing and can be improved.
- No exportable executive memo yet.

## 14. What I Would Do With Another 6 Hours

- Add DuckDB or ClickHouse for larger analytical workloads.
- Add exportable executive memo and board briefing outputs.
- Add a richer filter builder.
- Add a row-level use case detail drawer.
- Add model evals for tool choice and routing quality.
- Add better COTS product entity extraction and deduplication.
- Add multi-tenant org support with authentication and role-based access.
