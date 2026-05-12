"use client";

export function ChatLoadingState() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--muted)]">
      Loading conversation history...
    </div>
  );
}
