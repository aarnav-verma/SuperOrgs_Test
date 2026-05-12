import { Badge } from "@/components/ui/Badge";

type ProviderBadgeProps = {
  provider?: string;
};

export function ProviderBadge({ provider = "Misconfigured" }: ProviderBadgeProps) {
  const label = providerLabel(provider);
  const tone = label === "Misconfigured" ? "warning" : "neutral";

  return <Badge tone={tone}>Provider: {label}</Badge>;
}

function providerLabel(provider: string) {
  const normalized = provider.trim().toLowerCase();

  if (normalized === "openai") {
    return "OpenAI";
  }

  if (normalized === "anthropic") {
    return "Anthropic";
  }

  if (provider === "OpenAI" || provider === "Anthropic") {
    return provider;
  }

  return "Misconfigured";
}
