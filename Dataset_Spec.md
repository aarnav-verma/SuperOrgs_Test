# Dataset Specification

## Primary datasets

Use both OMB 2025 Federal Agency AI Use Case Inventory files.

Source repo:
`ombegov/2025-Federal-Agency-AI-Use-Case-Inventory`

Primary file:
`data/raw/2025_individually_reported_AI_use_cases.csv`

Secondary file:
`data/raw/2025_consolidated_COTS_AI_use_cases.csv`

## Dataset rationale

The individually reported file is the authoritative inventory for federal AI systems. The consolidated COTS file adds visibility into commercial tool adoption and sprawl. Together they support the product modes:
- Mission Control
- Inventory Intelligence
- Governance Risk Command Center
- AI Sprawl and COTS Adoption
- Cost Intelligence and ROI Simulation

The product should use the real inventory as the source of truth, then layer deterministic synthetic telemetry on top for cost, utilization, productivity, and trend analysis.

## Import requirements

Both raw CSVs must be committed into `data/raw` so Docker can run offline at runtime.

The import pipeline must:
- Read both files
- Normalize shared fields
- Preserve source file provenance
- Import analytics tables into Postgres
- Handle missing or blank columns safely

## Important raw columns

Import these raw columns when present:

- agency
- agency_name
- id
- use_case_name
- agency_bureau
- contact_email
- is_withheld
- development_stage
- is_high_impact
- HI_justification
- topic_area
- classification
- problem_solved
- benefits
- system_outputs
- operational_date
- contracting_usage
- vendor_name
- have_ato
- system_name_ato
- data_description
- link_to_data
- has_pii
- pia_url
- demographic_features
- has_custom_code
- code_url
- hi_testing_conducted
- hi_assessment_completed
- hi_potential_impacts
- hi_independent_review
- hi_ongoing_monitoring
- hi_training_established
- hi_failsafe_presence
- hi_appeal_process
- hi_public_consultation

For the COTS file, import all overlapping fields and preserve vendor/product/task fields that support sprawl analysis.

## Synthetic enrichment

The raw inventory is not a telemetry system. To support BI views, generate deterministic synthetic monthly metrics for each imported use case.

Create 12 months of metrics for every imported use case.

Table:
`monthly_metrics`

Fields:
- id
- ai_use_case_id
- month
- estimated_monthly_cost
- estimated_active_users
- task_volume
- estimated_hours_saved
- risk_score
- governance_score
- utilization_score

Generation rules:

1. Development stage
   - Deployed systems have higher task volume and active users
   - Pilot systems have moderate usage
   - Pre-deployment systems have low or zero usage
   - Retired systems decline over time

2. High-impact status
   - High-impact systems have higher baseline risk scores
   - High-impact systems require stronger governance controls

3. PII
   - Systems involving PII have higher risk scores
   - PII systems missing PIA or ATO should be flagged strongly

4. AI classification
   - Generative AI and Agentic AI should have higher simulated cost
   - Computer Vision may have moderate-to-high cost
   - Classical ML may have lower average cost
   - NLP should have variable usage

5. Governance controls
   - Governance score increases when high-impact controls are complete
   - Governance score decreases when controls are missing, blank, in-progress, or waived
   - Missing ATO reduces governance score for deployed and pilot systems

6. Trend behavior
   - Use deterministic seeded randomness
   - Some agencies should show growth
   - Some should show flat usage
   - Some should show risk increasing faster than governance
   - Ensure trends are demo-friendly and stable across seed runs

## Derived fields

Compute and store these:

- normalized_agency_name
- normalized_development_stage
- normalized_high_impact_status
- normalized_topic_area
- normalized_classification
- pii_boolean
- ato_boolean
- custom_code_boolean
- governance_control_completion_rate
- missing_governance_controls
- risk_tier:
  - Low
  - Medium
  - High
  - Critical

## Data quality requirements

- Handle UTF-8-SIG encoding
- Handle blank values
- Handle strange CSV quoting
- Handle stringified list fields
- Do not crash on missing columns
- Preserve source provenance for both CSVs
- Log import summary:
  - agencies imported
  - use cases imported
  - high-impact use cases
  - monthly metric rows generated
  - skipped rows if any

## README disclosure

The README must clearly say:
- The OMB inventory is real
- Monthly usage, cost, productivity, risk, and governance trends are deterministic synthetic estimates
- The synthetic layer exists because real enterprise AI cost and usage telemetry is private
- The synthetic metrics are derived from real inventory attributes such as development stage, high-impact status, PII involvement, ATO status, topic area, classification, and COTS adoption fields
