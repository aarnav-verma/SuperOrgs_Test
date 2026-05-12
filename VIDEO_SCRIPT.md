# Federal AI Mission Control Demo Script

## 60-Second Walkthrough

1. Open `http://localhost:3000`.
   - "This is Federal AI Mission Control, a compact chat-native BI product for the OMB 2025 Federal Agency AI Use Case Inventory."

2. Start at Mission Control.
   - "The first view is an executive portfolio baseline: total systems, active systems, high-impact systems, PII exposure, ATO coverage, governance readiness, and a clearly labeled synthetic monthly run-rate."

3. Ask: `Generate an executive briefing on the federal AI portfolio`.
   - "The assistant streams an answer and renders inline BI components rather than dumping raw JSON or SQL."

4. Ask: `Which deployed high-impact systems need governance review?`
   - "The governance queue uses exact high-impact matching and cautious language. Blank controls are treated as not reported or needs review, not as definitive non-compliance."

5. Ask: `Show COTS AI adoption by agency`.
   - "The COTS mode uses the consolidated COTS inventory to show commercial AI tool exposure, product concentration, license buckets, and synthetic license-spend estimates."

6. Ask: `How has estimated AI spend trended over the last year?`
   - "Cost, utilization, ROI, hours saved, risk trend, and governance trend values are deterministic synthetic estimates derived from real inventory attributes."

7. Refresh the page and reopen the conversation.
   - "Conversations, messages, and rendered tool payloads persist in Postgres, so the same charts and tables reappear after reload."

8. Show `.env`.
   - "Provider switching is controlled by `AI_PROVIDER`: OpenAI and Anthropic are both supported through the isolated provider layer."

## Closing Line

"The result is a small, polished BI vertical slice: real federal AI inventory data, consolidated COTS visibility, deterministic synthetic telemetry, safe typed tools, inline BI rendering, streaming chat, and Postgres-backed persistence."
