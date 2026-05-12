# Architecture Specification

## Stack

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn-style components or local equivalents
- Recharts for charts
- Prisma ORM
- PostgreSQL in Docker
- Vercel AI SDK for streaming and tool calls
- OpenAI provider
- Anthropic provider

## Docker requirement

The app must run from a fresh clone with Docker only.

Expected reviewer flow:

```sh
Create `.env` with the required values (see Environment variables below), then:
# add OpenAI and/or Anthropic keys and run:
docker compose up --build
```

No local Node installation.
No local Postgres installation.
No hosted database.
No hosted app services.

## Environment variables

```env
DATABASE_URL=postgresql://postgres:postgres@db:5432/federal_ai_mission_control
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-3-5-sonnet-latest
```

## Directory structure

```txt
app/
  page.tsx
  layout.tsx
  globals.css
  api/
    chat/route.ts
    conversations/route.ts
    conversations/[id]/route.ts
    health/route.ts

components/
  chat/
    ChatShell.tsx
    ConversationSidebar.tsx
    MessageList.tsx
    MessageBubble.tsx
    ChatInput.tsx
    EmptyState.tsx
    ProviderBadge.tsx
    DatasetBadge.tsx
    ToolRenderer.tsx
  analytics/
    KpiCardGrid.tsx
    BreakdownBarChart.tsx
    TrendLineChart.tsx
    GovernanceRiskTable.tsx
    UseCaseTable.tsx
    FollowupChips.tsx
    InsightCallout.tsx
  ui/
    button.tsx
    card.tsx
    badge.tsx
    table.tsx
    skeleton.tsx

lib/
  ai/
    provider.ts
    systemPrompt.ts
    tools.ts
    toolSchemas.ts
  analytics/
    queries.ts
    scoring.ts
    formatters.ts
    types.ts
  db/
    prisma.ts
  utils/
    csv.ts
    seededRandom.ts
    dates.ts

prisma/
  schema.prisma
  seed.ts

data/
  raw/
    2025_individually_reported_AI_use_cases.csv
    2025_consolidated_COTS_AI_use_cases.csv
  README.md

scripts/
  smoke-bi.ts
  smoke-normalization.ts
  docker-entrypoint.sh
```

## Migration strategy

Schema changes should be managed with Prisma migrations under `prisma/migrations`.
At runtime, the container applies migrations with `prisma migrate deploy`.
For local development with an existing database, `npm run db:deploy` applies migrations
and `npm run db:seed` rehydrates local dataset rows.

## Provider abstraction

All provider-specific logic must live in:

`lib/ai/provider.ts`

Expose:
- `getModelFromConfig()`
- `getProviderName()`
- `validateProviderEnv()`

The rest of the code should not import OpenAI or Anthropic directly.

Provider switching must be controlled only by `.env` values.

## Tool architecture

Do not let the model write SQL.

The model can call typed tools only. Each tool calls a safe query function from `lib/analytics/queries.ts`.

Tool layer:
`lib/ai/tools.ts`

Query layer:
`lib/analytics/queries.ts`

UI rendering layer:
`components/chat/ToolRenderer.tsx`

Tool results must map to cards, charts, tables, and follow-up chips rendered inline in chat.

## Persistence

Use Postgres for:
- conversations
- messages
- tool invocations
- tool result payloads

A user should be able to reload the page, reopen a conversation, and see prior user messages, assistant messages, and rendered tool outputs.

## Streaming

Assistant response should stream text progressively.

Tool invocations should render inline as they arrive or as soon as their result payload is available.

The UI should show:
- assistant is thinking
- tool loading state
- final rendered component

The perceived behavior should be responsive, not batch-oriented.

## Error handling

Handle:
- missing API key
- invalid `AI_PROVIDER`
- failed tool query
- empty analytics result
- database unavailable
- model calls wrong tool arguments
- provider timeout

When possible, show a useful user-facing error and keep the app usable.
