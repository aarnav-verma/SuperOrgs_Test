# Dataset Files

Federal AI Mission Control uses the OMB 2025 Federal Agency AI Use Case Inventory.

The Docker review flow must use local CSV files committed or placed in `data/raw`. The app must not depend on internet access at runtime.

## Required files

Place these files at the exact paths below before running the seed step:

- `data/raw/2025_individually_reported_AI_use_cases.csv`
- `data/raw/2025_consolidated_COTS_AI_use_cases.csv`

If either file is missing during seed, the seed script must fail with a clear error that lists the exact expected paths.

## Development-only fetch command

If internet access is available during development, fetch the raw CSVs from the OMB GitHub repository:

```sh
mkdir -p data/raw
curl -L \
  -o data/raw/2025_individually_reported_AI_use_cases.csv \
  https://raw.githubusercontent.com/ombegov/2025-Federal-Agency-AI-Use-Case-Inventory/main/Data/2025_individually_reported_AI_use_cases.csv
curl -L \
  -o data/raw/2025_consolidated_COTS_AI_use_cases.csv \
  https://raw.githubusercontent.com/ombegov/2025-Federal-Agency-AI-Use-Case-Inventory/main/Data/2025_consolidated_COTS_AI_use_cases.csv
```

Do not rely on this fetch command in Docker runtime or review flow. The CSV files should already be present locally when seeding runs.
