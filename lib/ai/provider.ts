import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

const SUPPORTED_PROVIDERS = ["openai", "anthropic"] as const;

export type AiProvider = (typeof SUPPORTED_PROVIDERS)[number];
export type ProviderDisplayName = "OpenAI" | "Anthropic" | "Misconfigured";

export type ProviderValidation =
  | {
      ok: true;
      provider: AiProvider;
      providerName: Exclude<ProviderDisplayName, "Misconfigured">;
      model: string;
    }
  | {
      ok: false;
      provider: string;
      providerName: "Misconfigured";
      error: string;
    };

export function getProviderName(): ProviderDisplayName {
  const validation = validateProviderEnv();
  return validation.ok ? validation.providerName : "Misconfigured";
}

export function validateProviderEnv(): ProviderValidation {
  const provider = normalizeProvider(process.env.AI_PROVIDER);

  if (!isSupportedProvider(provider)) {
    return {
      ok: false,
      provider,
      providerName: "Misconfigured",
      error: `Invalid AI_PROVIDER "${provider}". Expected "openai" or "anthropic".`
    };
  }

  if (provider === "openai") {
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    if (!process.env.OPENAI_API_KEY?.trim()) {
      return {
        ok: false,
        provider,
        providerName: "Misconfigured",
        error: "OPENAI_API_KEY is required when AI_PROVIDER=openai."
      };
    }

    return {
      ok: true,
      provider,
      providerName: "OpenAI",
      model
    };
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return {
      ok: false,
      provider,
      providerName: "Misconfigured",
      error: "ANTHROPIC_API_KEY is required when AI_PROVIDER=anthropic."
    };
  }

  return {
    ok: true,
    provider,
    providerName: "Anthropic",
    model
  };
}

export function getModelFromConfig() {
  return getModelForRequest();
}

export function getModelForRequest(requestProvider?: string) {
  const provider = requestProvider
    ? normalizeProvider(requestProvider)
    : normalizeProvider(process.env.AI_PROVIDER);

  if (!isSupportedProvider(provider)) {
    throw new Error(`Invalid provider "${provider}". Expected "openai" or "anthropic".`);
  }

  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new Error("OPENAI_API_KEY is not configured for the openai provider.");
    }
    return openai(process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini");
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    throw new Error("ANTHROPIC_API_KEY is not configured for the anthropic provider.");
  }
  return anthropic(process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6");
}

export function getAvailableProviders(): AiProvider[] {
  const available: AiProvider[] = [];
  if (process.env.OPENAI_API_KEY?.trim()) available.push("openai");
  if (process.env.ANTHROPIC_API_KEY?.trim()) available.push("anthropic");
  return available;
}

function normalizeProvider(provider: string | undefined) {
  return provider?.trim().toLowerCase() || "openai";
}

function isSupportedProvider(provider: string): provider is AiProvider {
  return SUPPORTED_PROVIDERS.includes(provider as AiProvider);
}
