const AGENCY_NAME_OVERRIDES = new Map<string, string>([
  ["department of treasury", "Department of the Treasury"],
  [
    "department of veteran affairs-oig",
    "Department of Veterans Affairs Office of the Inspector General"
  ],
  ["export-import bank of the u.s.", "Export-Import Bank of the United States"],
  ["export-import bank of the us", "Export-Import Bank of the United States"],
  ["export-import bank of the united states", "Export-Import Bank of the United States"]
]);

const TOPIC_AREA_OVERRIDES = new Map<string, string>([
  ["administrative functions", "Admin Functions"],
  ["information technology", "IT"],
  ["government benefits processing", "Benefits Processing"],
  ["energy and the environment", "Energy and Environment"],
  ["human resources", "HR"],
  ["emergency management", "Emergency Mgmt"],
  ["procurement and financial management", "Procurement and Finance Mgmt"]
]);

const CLASSIFICATION_OVERRIDES = new Map<string, string>([
  ["natural language processing", "NLP"],
  ["nlp", "NLP"],
  ["computer vision", "Computer Vision"],
  ["generative ai", "Generative AI"],
  ["gen ai", "Generative AI"],
  ["agentic ai", "Agentic AI"],
  ["classical ml", "Classical ML"],
  ["machine learning", "Classical ML"]
]);

const DEVELOPMENT_STAGE_OVERRIDES = new Map<string, string>([
  ["deployed", "Deployed"],
  ["production", "Deployed"],
  ["operational", "Deployed"],
  ["active", "Deployed"],
  ["pilot", "Pilot"],
  ["piloting", "Pilot"],
  ["prototype", "Pilot"],
  ["testing", "Pilot"],
  ["pre-deployment", "Pre-deployment"],
  ["pre deployment", "Pre-deployment"],
  ["predeployment", "Pre-deployment"],
  ["planning", "Pre-deployment"],
  ["development", "Pre-deployment"],
  ["in development", "Pre-deployment"],
  ["retired", "Retired"],
  ["decommissioned", "Retired"],
  ["inactive", "Retired"]
]);

const LICENSE_MIDPOINTS = new Map<string, number>([
  ["1-100", 50],
  ["101-1000", 550],
  ["1001-5000", 3000],
  ["5001-10,000", 7500],
  ["5001-10000", 7500],
  ["10,000-50,000", 30000],
  ["10000-50000", 30000],
  ["50,000+", 60000],
  ["50000+", 60000]
]);

export function normalizeWhitespace(value: unknown): string {
  if (value == null) {
    return "";
  }

  return String(value).replace(/\uFEFF/g, "").replace(/\s+/g, " ").trim();
}

export function emptyToNull(value: unknown): string | null {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function normalizeAgencyName(value: unknown): string | null {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return null;
  }

  return AGENCY_NAME_OVERRIDES.get(normalized.toLowerCase()) ?? normalized;
}

export function normalizeTopicArea(value: unknown): string | null {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return null;
  }

  return TOPIC_AREA_OVERRIDES.get(normalized.toLowerCase()) ?? normalized;
}

export function normalizeClassification(value: unknown): string | null {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return null;
  }

  return CLASSIFICATION_OVERRIDES.get(normalized.toLowerCase()) ?? normalized;
}

export function normalizeDevelopmentStage(value: unknown): string {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return "Unknown";
  }

  const key = normalized.toLowerCase();
  const exactMatch = DEVELOPMENT_STAGE_OVERRIDES.get(key);
  if (exactMatch) {
    return exactMatch;
  }

  if (key.includes("retired") || key.includes("decommissioned") || key.includes("inactive")) {
    return "Retired";
  }

  if (
    key.includes("pre-deployment") ||
    key.includes("pre deployment") ||
    key.includes("not deployed") ||
    key.includes("planning") ||
    key.includes("design") ||
    key.includes("development")
  ) {
    return "Pre-deployment";
  }

  if (key.includes("pilot") || key.includes("prototype") || key.includes("test")) {
    return "Pilot";
  }

  if (key.includes("deployed") || key.includes("production") || key.includes("operational")) {
    return "Deployed";
  }

  return "Unknown";
}

export function parseBooleanish(value: unknown): boolean | null {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return null;
  }

  const key = normalized.toLowerCase();

  if (["yes", "true", "y", "1"].includes(key)) {
    return true;
  }

  if (["no", "false", "n", "0"].includes(key)) {
    return false;
  }

  if (["blank", "n/a", "na", "none", "not applicable", "unknown"].includes(key)) {
    return null;
  }

  return null;
}

export function parseOperationalDate(value: unknown): Date | null {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

export function parsePythonListString(value: unknown): string[] | null {
  const normalized = emptyToNull(value);
  if (!normalized) {
    return null;
  }

  const trimmed = normalized.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [trimmed];
  }

  try {
    const jsonish = trimmed.replace(/\bNone\b/g, "null").replace(/'/g, "\"");
    const parsed = JSON.parse(jsonish) as unknown;

    if (!Array.isArray(parsed)) {
      return null;
    }

    return parsed
      .filter((item): item is string | number | boolean => item != null)
      .map((item) => normalizeWhitespace(item))
      .filter(Boolean);
  } catch {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.replace(/^['"]|['"]$/g, ""))
      .map(normalizeWhitespace)
      .filter(Boolean);
  }
}

export function isHighImpactExact(value: unknown): boolean {
  return value === "High-impact";
}

export function isActiveStage(normalizedStage: unknown): boolean {
  return ["Deployed", "Pilot"].includes(normalizeWhitespace(normalizedStage));
}

export function estimateLicenseMidpoint(bucket: unknown): number | null {
  const normalized = emptyToNull(bucket);
  if (!normalized) {
    return null;
  }

  const key = normalized.replace(/\s+/g, "");
  return LICENSE_MIDPOINTS.get(key) ?? null;
}

export function splitProductNames(productText: unknown): string[] {
  const normalized = emptyToNull(productText);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(/\s*(?:,|;|\||\/|&|\band\b)\s*/i)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index);
}
