# Federal AI Mission Control

Build a compact, polished, chat-native BI product for the OMB 2025 Federal Agency AI Use Case Inventory.

The product should feel aligned with SuperOrgs' mission: AI workforce visibility, governance, cost intelligence, adoption planning, tool sprawl visibility, and executive decision support.

## Core take-home requirements

The app must satisfy all of these:

1. Dual provider support
   - Support both OpenAI and Anthropic out of the box
   - Provider must be selected via environment config only
   - Switching providers must require `.env` changes only
   - No code changes should be required to switch providers

2. Real database
   - Use Postgres in Docker
   - Store analytics data in Postgres
   - Store conversations, messages, tool invocations, and tool result payloads in Postgres
   - No in-memory state for core data

3. Tools that render UI
   - Assistant must call typed tools
   - Tool results must render inline in the chat
   - Include KPI cards, charts, tables, and follow-up chips
   - Render tool content as cards, charts, tables, and follow-up controls, not plain text dumps

4. Streaming
   - Assistant text should stream
   - Tool calls and tool results should appear progressively
   - The app should feel responsive instead of waiting and dumping a wall of text

5. Persistence
   - Conversations persist across reloads
   - Users can reopen a prior conversation and continue it

6. Dataset
   - Use both OMB CSV files:
     - `2025_individually_reported_AI_use_cases.csv`
     - `2025_consolidated_COTS_AI_use_cases.csv`
   - Commit both raw CSVs into `data/raw` so Docker does not need internet access at runtime
   - Explain the real-versus-synthetic split in README
   - Add deterministic synthetic monthly telemetry for time-series analytics

7. Fully Dockerized local stack
   - Reviewer should need only Docker
   - No local Node, Python, Postgres, or hosted database setup
   - README must document fresh clone instructions

## Product standard

This should not feel like a generic dashboard or CSV chatbot. It should feel like a BI product that could plausibly exist inside SuperOrgs.

Prioritize a small, excellent vertical slice over broad unfinished functionality.
