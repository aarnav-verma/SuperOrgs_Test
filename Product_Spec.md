# Product Specification

## Product name

Federal AI Mission Control

## One-liner

A compact, chat-native BI tool for the OMB 2025 Federal Agency AI Use Case Inventory, with executive overview, inventory exploration, governance risk, AI sprawl, and synthetic cost intelligence modes.

## Target user

A leader responsible for AI governance, AI operations, procurement visibility, or portfolio oversight:
- Chief AI Officer
- CTO
- CISO
- CFO
- Agency CIO
- AI governance lead
- Procurement or sourcing lead
- Board-facing executive preparing an AI portfolio briefing

## Product promise

The user should be able to ask:
- What systems exist across the federal AI portfolio?
- Where is adoption concentrated by agency, bureau, topic, or classification?
- Which systems are high-impact or involve PII?
- Which systems need governance review or missing-control follow-up?
- Where is commercial AI sprawl visible in the COTS inventory?
- Where do synthetic cost and utilization trends suggest growth, waste, or risk?

## Five BI modes

1. Mission Control
   - Executive overview of the AI portfolio
   - Total systems
   - Active systems
   - High-impact systems
   - PII exposure
   - ATO coverage
   - Governance readiness
   - Estimated monthly run-rate from synthetic telemetry

2. Inventory Intelligence
   - Explore AI systems by agency, bureau, development stage, topic area, and AI classification
   - Search systems by keyword, topic, agency, or classification

3. Governance Risk Command Center
   - Prioritize high-impact systems, deployed systems, PII systems, missing ATO, and incomplete or not reported governance controls
   - Show app-derived risk score and governance readiness score
   - Use cautious language like "needs review" or "not reported"

4. AI Sprawl and COTS Adoption
   - Use the consolidated COTS AI use case file
   - Analyze commercial AI products, common AI tasks, license exposure, and agency-level AI tool adoption
   - Treat this as a tool-visibility and sprawl problem, not a generic SaaS dashboard

5. Cost Intelligence and ROI Simulation
   - Use deterministic synthetic monthly telemetry
   - Show estimated monthly spend, annualized run-rate, task volume, hours saved, utilization, and savings opportunities
   - Clearly label cost, utilization, ROI, and trend data as synthetic estimates derived from real inventory attributes

## Design principles

1. Chat-first, not dashboard-first
   - Users ask natural language questions
   - The assistant chooses the BI mode and the relevant tools
   - Charts, tables, cards, and chips appear inline in the conversation

2. Executive-grade
   - Responses should feel board-ready
   - Charts should be clean and compact
   - Tables should be readable at a glance
   - Do not overuse color or decorative motion

3. Grounded in data
   - Never invent counts, shares, or trends
   - Use tools for quantitative claims
   - If the question is outside the dataset, say what can and cannot be answered

4. Productized follow-up flow
   - Every substantive answer should include useful follow-up chips
   - Follow-ups should continue the conversation and narrow the analysis

## Core user journeys

### Journey 1: Mission Control overview

User asks:
"Give me the mission control overview of the federal AI portfolio"

Assistant should return:
- Short summary
- KPI cards:
  - Total systems
  - Active systems
  - High-impact systems
  - PII exposure
  - ATO coverage
  - Governance readiness
  - Estimated monthly run-rate
- One chart:
  - Systems by development stage
- Follow-up chips:
  - Show high-impact systems
  - Break down by agency
  - Show governance gaps
  - Show cost trend

### Journey 2: Inventory Intelligence

User asks:
"Which agencies and bureaus have the most deployed AI systems?"

Assistant should return:
- Bar chart or table by agency and bureau
- Search-ready filters or chips
- Compact table with:
  - Agency
  - Bureau
  - Total systems
  - Active systems
  - High-impact count
  - PII count
- Follow-up chips:
  - Filter to topic area
  - Filter to classification
  - Search by keyword
  - Show only deployed systems

### Journey 3: Governance Risk Command Center

User asks:
"Which deployed high-impact systems need review?"

Assistant should return:
- Risk table with:
  - Use case name
  - Agency
  - Bureau
  - Classification
  - Topic area
  - PII
  - ATO
  - Missing governance controls
  - Risk score
  - Governance readiness score
- Follow-up chips:
  - Show only PII systems
  - Show only missing ATO
  - Summarize remediation needs
  - Compare by agency

### Journey 4: AI Sprawl and COTS Adoption

User asks:
"What commercial AI tools are showing up most across agencies?"

Assistant should return:
- Bar chart or ranked table of COTS tools and tasks
- Table with:
  - Vendor / product
  - Agency
  - Common task
  - Adoption count
  - License exposure
  - Notes on sprawl concentration
- Follow-up chips:
  - Show agency adoption
  - Show common tasks
  - Compare by vendor
  - Show license exposure

### Journey 5: Cost Intelligence and ROI Simulation

User asks:
"How has estimated AI spend trended over the last year?"

Assistant should return:
- Line chart of estimated monthly spend
- KPI cards:
  - Current month estimated spend
  - Month-over-month change
  - Estimated annualized run-rate
  - Highest growth agency
- Follow-up chips:
  - Break down by agency
  - Show task volume
  - Show hours saved
  - Find savings opportunities

## Empty state copy

Title:
Federal AI Mission Control

Subtitle:
Ask questions about the 2025 Federal AI Use Case Inventory. I can analyze mission control metrics, inventory structure, governance readiness, AI sprawl, and synthetic cost and utilization trends.

Prompt cards:
- Give me the mission control overview
- Which agencies have the most deployed AI systems?
- Which deployed high-impact systems need review?
- What commercial AI tools are showing up most across agencies?
- How has estimated AI spend trended over the last year?
- Where is adoption growing faster than governance readiness?

## Visual design

Use a clean enterprise style:
- White or near-black background
- Subtle gray borders
- Compact rounded cards
- Dense, readable typography
- Clean charts
- Strong hierarchy
- Provider badge
- Dataset badge
- No gimmicky animations
- No neon hackathon aesthetic

The UI should feel closer to Linear, Ramp, Superhuman, or an enterprise analytics command center than a generic AI demo.
