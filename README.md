# Federal AI Mission Control

A chat-native BI product for the OMB 2025 Federal Agency AI Use Case Inventory. Ask natural-language questions and get inline BI components — KPI cards, charts, tables, risk queues, and follow-up chips — streamed back in a single conversation surface.

---

## Quick Start (Docker)

**Requirements:** Docker, one API key (OpenAI or Anthropic). No local Node or Postgres needed.

```sh
cp .env.example .env
# Edit .env: set AI_PROVIDER and add the matching API key (see Provider Switching below)
docker compose up --build
```

App runs at **http://localhost:3000**.

The container automatically waits for Postgres, applies Prisma migrations, seeds the analytics tables from `data/raw/`, and starts the Next.js server. First startup takes ~2–3 minutes to build.

**Required data files** (should be committed with the repo — Docker needs no internet access):

```
data/raw/2025_individually_reported_AI_use_cases.csv
data/raw/2025_consolidated_COTS_AI_use_cases.csv
```

---

## Provider Switching

Set two env vars in `.env`. No code changes required.

**OpenAI:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

**Anthropic:**
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
```

Provider-specific logic is fully isolated in `lib/ai/provider.ts`. The rest of the app calls `getModelFromConfig()` and is provider-agnostic via the Vercel AI SDK.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | Postgres connection string. Use `db` hostname inside Docker. |
| `AI_PROVIDER` | Yes | `openai` | `openai` or `anthropic` |
| `OPENAI_API_KEY` | If OpenAI | — | Required when `AI_PROVIDER=openai` |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | OpenAI model name |
| `ANTHROPIC_API_KEY` | If Anthropic | — | Required when `AI_PROVIDER=anthropic` |
| `ANTHROPIC_MODEL` | No | `claude-sonnet-4-6` | Anthropic model name |
| `DB_WAIT_TIMEOUT_MS` | No | `120000` | Startup timeout for Postgres wait loop (ms) |
| `SEED_ON_START` | No | `auto` | `auto` seeds when tables are empty, `true` forces seed, `false` skips |

---

## Demo Queries

- Generate an executive briefing on the federal AI portfolio
- Which agencies have the most high-impact AI systems?
- Which deployed high-impact systems need governance review?
- Show COTS AI adoption by agency
- How has estimated AI spend trended over the last year?
- Where is adoption growing faster than governance readiness?
- Find generative AI systems involving PII

See `VIDEO_SCRIPT.md` for a concise demo walkthrough.

---

## Data Sources

**Real public data:**
- `2025_individually_reported_AI_use_cases.csv` — AI inventory, agency/bureau analysis, development stage, topic/classification mix, high-impact review, PII exposure, ATO coverage, governance readiness.
- `2025_consolidated_COTS_AI_use_cases.csv` — COTS adoption, commercial product visibility, license bucket exposure, agency-level AI tool sprawl.

**Synthetic enrichment:**
Monthly cost, usage, ROI, hours saved, utilization, risk trends, and governance trends are deterministic synthetic values derived from real inventory attributes (stage, high-impact status, PII, ATO, topic, classification). They are useful for BI workflow demonstration but are not official OMB-reported spend, usage, or risk scores.

---

## Architecture

- **Next.js App Router** — UI and API routes
- **TypeScript** throughout
- **Tailwind CSS** with compact enterprise UI primitives
- **Postgres in Docker** — analytics data and chat persistence
- **Prisma** — schema, migrations, seed workflows
- **Vercel AI SDK** — streaming chat and typed tool calls
- **Provider abstraction** in `lib/ai/provider.ts` — swap OpenAI ↔ Anthropic via env vars
- **Typed tools** in `lib/ai/tools.ts`
- **Safe BI query layer** in `lib/analytics/queries.ts` — the model never writes SQL
- **Inline BI rendering** in `components/chat/ToolRenderer.tsx`
- **Chat persistence** — conversations, messages, and tool result payloads stored in Postgres and replayed on reload

---

## BI Tools

| Tool | What it answers |
|---|---|
| `getMissionControlSnapshot` | Executive overview: KPIs, findings, risks, recommended actions, stage mix, high-impact agency concentration |
| `getInventoryBreakdown` | Rankings and distributions by agency, bureau, stage, topic, or classification |
| `getRiskCommandCenter` | Prioritized governance review queue: high-impact, deployed, PII, missing ATO, missing controls |
| `getCotsAdoption` | COTS adoption, top commercial products, license buckets, tool sprawl |
| `getCostIntelligence` | Synthetic spend trend, annualized run-rate, cost by agency/classification, ROI simulation |
| `searchUseCases` | Row-level search across system name, problem, benefits, outputs, agency, topic, classification |
| `getAdoptionGovernanceMatrix` | Adoption vs. governance readiness quadrants |
| `getFollowupSuggestions` | Context-aware follow-up chips after each analytical answer |

**Adding a tool:**
1. Add a typed query function in `lib/analytics/queries.ts`
2. Add result types in `lib/analytics/types.ts`
3. Register the zod-validated tool in `lib/ai/tools.ts`
4. Add rendering support in `components/chat/ToolRenderer.tsx`

---

## Docker Operations

```sh
# Start everything
docker compose up --build

# Tail app logs
docker compose logs -f app

# Check container status
docker compose ps

# Run BI smoke tests
docker compose exec app npm run smoke:bi

# Clean restart (drops Postgres volume — use after schema or data changes)
docker compose down -v && docker compose up --build
```

Manual database commands inside the container:

```sh
docker compose exec app npm run db:deploy   # apply migrations
docker compose exec app npm run db:seed     # re-seed analytics tables
docker compose exec app npm run db:reset    # reset and re-seed
```

---

## Database Schema

| Table | Contents |
|---|---|
| `Agency` | Normalized agency identity shared by individual and COTS records |
| `AiUseCase` | Individual OMB AI use case records with stage, high-impact, topic, classification, PII, ATO, and raw row JSON |
| `GovernanceControl` | High-impact governance fields, missing-control labels, risk drivers, app-derived governance and risk scores |
| `CotsUseCase` | Consolidated COTS records with product text, parsed product names, license bucket, and estimated monthly spend |
| `MonthlyMetric` | Deterministic synthetic monthly cost, users, task volume, hours saved, risk, governance, utilization, and adoption scores |
| `Conversation` | Persisted chat thread metadata |
| `Message` | Persisted user/assistant messages with optional tool results |

---

## Libraries

Next.js · React · TypeScript · Tailwind CSS · Prisma · Vercel AI SDK · `@ai-sdk/openai` · `@ai-sdk/anthropic` · Recharts · zod · csv-parse · tsx · ESLint

---

## Known Limitations

- Synthetic telemetry is deterministic demo data, not official OMB telemetry.
- No authentication — single-user local deployment.
- Risk scoring is app-derived prioritization, not an official OMB risk or compliance determination.
- COTS product extraction uses simple text parsing.
- No exportable executive memo output.
