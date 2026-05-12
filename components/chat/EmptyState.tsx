import { DisclosureBadge } from "@/components/common/DisclosureBadge";
import { DatasetBadge } from "@/components/common/DatasetBadge";
import { ProviderBadge } from "@/components/common/ProviderBadge";
import { SuggestedPromptCard } from "@/components/chat/SuggestedPromptCard";
import { Card } from "@/components/ui/Card";

type EmptyStateProps = {
  provider: string;
  prompts: string[];
};

export function EmptyState({ provider, prompts }: EmptyStateProps) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <DatasetBadge />
          <ProviderBadge provider={provider} />
          <DisclosureBadge />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-5">
        <div className="w-full max-w-3xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Mission Control
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Federal AI Mission Control
            </h1>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">
              Chat-native BI for AI inventory, governance, COTS adoption, and cost intelligence
            </p>
          </div>

          <Card className="mt-8 border-[var(--border)] bg-[var(--panel)] p-4">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Ask about portfolio exposure, governance readiness, COTS sprawl, or synthetic cost
              trends. Responses stream in real time and remain persisted in Postgres.
            </p>
          </Card>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {prompts.map((prompt) => (
              <SuggestedPromptCard key={prompt} prompt={prompt} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
