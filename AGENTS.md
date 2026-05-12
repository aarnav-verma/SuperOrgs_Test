# Instructions for Codex

Read `Goal.md`, `Product_Spec.md`, `Dataset_Spec.md`, `Architecture.md`, and `AI_Behavior.md` before changing code.

## Project goal

Build Federal AI Mission Control, a compact chat-native BI tool over the OMB 2025 Federal Agency AI Use Case Inventory.

Prioritize a small polished product over broad unfinished features.

## Stack

Use:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma
- Postgres in Docker
- Recharts
- Vercel AI SDK

## Hard constraints

- Use Postgres in Docker for both analytics data and chat persistence
- Support OpenAI and Anthropic via `AI_PROVIDER` in `.env`
- Keep provider logic isolated in `lib/ai/provider.ts`
- Keep tool definitions in `lib/ai/tools.ts`
- Keep safe analytics queries in `lib/analytics/queries.ts`
- Keep scoring logic in `lib/analytics/scoring.ts`
- Keep tool rendering in `components/chat/ToolRenderer.tsx`
- Never allow arbitrary SQL from the model
- Use both individual AI use cases and consolidated COTS AI use cases
- Clearly label synthetic metrics

## Data rules

- Use exact match for high-impact status: only `"High-impact"` is high impact
- Treat blank governance controls for high-impact systems as `"not reported"` or `"needs review"`, not as definitive non-compliance
- Preserve provenance between the individual inventory and the COTS inventory

## Coding standards

- Prefer simple, explicit code
- Keep provider abstraction isolated
- Keep analytics query logic separate from tool definitions
- Keep tool rendering separate from model logic
- Validate tool inputs
- Handle empty states
- Handle errors clearly
- Avoid overengineering

## Validation behavior

Validate changes with `typecheck`, `lint`, `build`, and smoke scripts where available.

After each substantial step, report:
- commands run
- results
- any remaining issues

## Suggested commit cadence

1. Update specs
2. Scaffold dockerized app
3. Add schema and dataset ingestion
4. Add derived scoring and synthetic telemetry
5. Add BI query layer
6. Add BI components and static Mission Control
7. Add persisted chat
8. Add provider abstraction and streaming
9. Add AI tools and inline rendering
10. Polish README and video script

## Product standards

- Build a compact, polished, chat-native BI tool
- Make Mission Control the default first view
- Keep the five BI modes obvious in the UX
- Use cautious BI language like `"needs review"` and `"not reported"`
- Avoid generic chatbot phrasing
- Avoid colorful hackathon dashboard styling
