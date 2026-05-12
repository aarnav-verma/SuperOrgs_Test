"use client";

import { Button } from "@/components/ui/Button";

type ChatErrorCardProps = {
  disabled?: boolean;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
};

export function ChatErrorCard({
  disabled = false,
  message,
  onDismiss,
  onRetry
}: ChatErrorCardProps) {
  return (
    <div className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-soft)] p-3 text-sm leading-6 text-[var(--warning)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">Chat request failed</p>
          <p className="mt-1">{message}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {onRetry ? (
            <Button disabled={disabled} onClick={onRetry} size="sm" variant="secondary">
              Retry
            </Button>
          ) : null}
          {onDismiss ? (
            <Button disabled={disabled} onClick={onDismiss} size="sm" variant="ghost">
              Dismiss
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
