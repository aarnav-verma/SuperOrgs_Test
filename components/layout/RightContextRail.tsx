"use client";

import { DisclosureBadge } from "@/components/common/DisclosureBadge";
import { Card } from "@/components/ui/Card";
import { SuggestedPromptCard } from "@/components/chat/SuggestedPromptCard";

const quickPrompts = [
  "Which agencies have the most high-impact AI systems?",
  "Which deployed high-impact systems need governance review?",
  "Show COTS AI adoption by agency",
  "What are the highest-risk systems this year?",
  "Show systems requiring ATO attention",
  "Where is adoption growing faster than governance readiness?"
];

function dispatchQuickPrompt(prompt: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent("federal-ai-mission-control:quick-prompt", {
      detail: { prompt }
    })
  );
}

export function RightContextRail() {
  return (
    <aside className="flex h-screen min-h-0 flex-col gap-4 border-l border-[var(--border)] bg-[var(--rail)] p-4">
      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Portfolio context</p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              This workspace supports mission-ready portfolio visibility across OMB individual and COTS
              use-case records.
            </p>
          </div>
          <DisclosureBadge label="Real inventory" />
        </div>
        <p className="mt-4 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
          Cost, utilization, ROI, and trend metrics are deterministic synthetic estimates derived from
          real inventory attributes.
        </p>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold">How to use this view</p>
        <div className="mt-4 space-y-3 text-xs leading-5 text-[var(--muted)]">
          <p>Use the left rail to move between BI modes quickly.</p>
          <ol className="list-inside list-decimal space-y-2 pl-2">
            <li>Start at Mission Control for portfolio baseline and executive summary.</li>
            <li>Use Inventory and COTS for exposure and adoption concentration.</li>
            <li>Use Governance Risk and Cost Intelligence for mitigation priorities.</li>
          </ol>
        </div>
      </Card>

      <Card className="p-4">
        <p className="text-sm font-semibold">Suggested executive queries</p>
        <div className="mt-3 space-y-2">
          {quickPrompts.map((prompt) => (
            <SuggestedPromptCard key={prompt} onSelect={dispatchQuickPrompt} prompt={prompt} />
          ))}
        </div>
      </Card>
    </aside>
  );
}
