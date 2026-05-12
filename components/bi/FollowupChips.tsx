"use client";

import type { FollowupSuggestionsResult } from "@/lib/analytics/types";

import { Button } from "@/components/ui/Button";
import { BiComponentFrame } from "./BiComponentFrame";

type FollowupChipsProps = {
  result?: FollowupSuggestionsResult;
  suggestions?: string[];
  loading?: boolean;
  error?: string | null;
  onSelect?: (suggestion: string) => void;
};

export function FollowupChips({
  result,
  suggestions,
  loading,
  error,
  onSelect
}: FollowupChipsProps) {
  const chips = result?.suggestions ?? suggestions ?? [];

  return (
    <BiComponentFrame
      title="Suggested next questions"
      loading={loading}
      error={error}
      empty={chips.length === 0}
      emptyMessage="No follow-up suggestions available."
    >
      <div className="flex flex-wrap gap-2">
        {chips.map((suggestion) => (
          <Button
            key={suggestion}
            onClick={() => onSelect?.(suggestion)}
            size="sm"
            variant="subtle"
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </BiComponentFrame>
  );
}
