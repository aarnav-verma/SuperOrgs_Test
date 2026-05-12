"use client";

import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { ToolRenderer } from "@/components/chat/ToolRenderer";

export type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt?: string;
  partsJson?: unknown;
  streaming?: boolean;
  toolError?: string | null;
  toolLoading?: boolean;
  toolName?: string;
  toolResultsJson?: unknown;
};

type MessageListProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
  onFollowupSelect?: (prompt: string) => void;
};

export function MessageList({
  isLoading = false,
  messages,
  onFollowupSelect
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] p-6 text-center text-sm leading-6 text-[var(--muted)]">
        Ask a question to start a persisted BI analysis. Responses stream in real time and are saved to
        Postgres.
      </div>
    );
  }

  return (
      <div
        aria-live="polite"
        className="min-h-[280px] max-h-[56vh] space-y-3 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--panel)] p-3 pr-1"
      >
        {messages.map((message) => {
        const toolPayload =
          message.toolResultsJson ??
          (containsToolComponentPayload(message.partsJson) ? message.partsJson : null);
        const hasToolOutput = message.toolLoading || message.toolError || toolPayload;
        const showMessage = message.content || message.streaming;

        return (
          <div className="space-y-2" key={message.id}>
            {showMessage ? (
              <MessageBubble
                content={message.content}
                role={message.role}
                streaming={message.streaming}
                createdAt={message.createdAt}
              />
            ) : null}
            {message.toolName && !hasToolOutput && message.toolLoading ? (
              <div className="pl-0 md:pl-8">
                <ToolRenderer
                  loading
                  onFollowupSelect={onFollowupSelect}
                  result={undefined}
                />
              </div>
            ) : null}
            {hasToolOutput ? (
              <div className="pl-0 md:pl-8">
                <ToolRenderer
                  error={message.toolError ?? null}
                  loading={message.toolLoading}
                  result={toolPayload}
                  onFollowupSelect={onFollowupSelect}
                />
              </div>
            ) : null}
          </div>
        );
      })}

      {isLoading ? (
        <div className="rounded-md border border-dashed border-[var(--accent-light)] bg-[var(--soft)] px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
          Assistant is thinking
        </div>
      ) : null}

      <div ref={endRef} />
    </div>
  );
}

function containsToolComponentPayload(value: unknown): boolean {
  if (!value) {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(containsToolComponentPayload);
  }

  if (typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.componentType === "string") {
    return true;
  }

  return ["result", "results", "output", "toolResults"].some((key) =>
    containsToolComponentPayload(record[key])
  );
}
