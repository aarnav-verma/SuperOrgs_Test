"use client";

import { useCallback, useEffect, useState } from "react";

import { ChatErrorCard } from "@/components/chat/ChatErrorCard";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatLoadingState } from "@/components/chat/ChatLoadingState";
import { type ChatMessage, MessageList } from "@/components/chat/MessageList";
import { SuggestedPromptCard } from "@/components/chat/SuggestedPromptCard";
import { DatasetBadge } from "@/components/common/DatasetBadge";
import { DisclosureBadge } from "@/components/common/DisclosureBadge";
import { ProviderBadge } from "@/components/common/ProviderBadge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ConversationSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  } | null;
};

type ConversationDetail = {
  id: string;
  title: string;
  messages: ChatMessage[];
};

type ChatShellProps = {
  provider: string;
  suggestedPrompts: string[];
};

type ChatErrorState = {
  message: string;
  retryClientMessageId?: string;
  retryMessage?: string;
};

type SubmitMessageOptions = {
  appendUser?: boolean;
  clientMessageId?: string;
};

type ChatStreamEvent =
  | {
      type: "start";
      conversationId: string;
    }
  | {
      type: "text_delta";
      text: string;
    }
  | {
      type: "tool_call";
      toolCallId: string;
      toolName: string;
    }
  | {
      type: "tool_result";
      toolCallId: string;
      toolName: string;
      result: unknown;
    }
  | {
      type: "tool_error";
      toolCallId?: string;
      toolName?: string;
      message: string;
    }
  | {
      type: "finish";
      conversationId: string;
    };

export function ChatShell({ provider, suggestedPrompts }: ChatShellProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<ChatErrorState | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  function conversationSnippet(summary: ConversationSummary) {
    if (!summary.lastMessage) {
      return "No messages yet";
    }

    const text = summary.lastMessage.content || "No message text";
    return `${summary.lastMessage.role === "user" ? "You" : "Mission Control"}: ${text}`;
  }

  const refreshConversations = useCallback(async () => {
    const response = await fetch("/api/conversations", { cache: "no-store" });
    const payload = await response.json();

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error?.message ?? "Unable to load conversations");
    }

    setConversations(payload.conversations ?? []);
    return (payload.conversations ?? []) as ConversationSummary[];
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    setIsLoadingConversation(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error?.message ?? "Unable to load conversation");
      }

      const conversation = payload.conversation as ConversationDetail;
      setConversationId(conversation.id);
      setMessages(conversation.messages ?? []);
    } catch (loadError) {
      setError({
        message: loadError instanceof Error ? loadError.message : "Unable to load conversation"
      });
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  const submitMessage = useCallback(async (message: string, options: SubmitMessageOptions = {}) => {
    if (isStreaming) {
      return;
    }

    const clientMessageId = options.clientMessageId ?? createClientMessageId();
    const appendUser = options.appendUser ?? true;
    const userMessage: ChatMessage = {
      id: `local-user-${clientMessageId}`,
      role: "user",
      content: message
    };
    const assistantMessageId = `local-assistant-${clientMessageId}`;

    setError(null);
    setIsStreaming(true);
    setMessages((currentMessages) => {
      const withoutPriorLocalAssistant = currentMessages.filter(
        (currentMessage) => currentMessage.id !== assistantMessageId
      );
      const userMessageAlreadyPresent = withoutPriorLocalAssistant.some(
        (currentMessage) => currentMessage.id === userMessage.id
      );
      const nextMessages =
        appendUser && !userMessageAlreadyPresent
          ? [...withoutPriorLocalAssistant, userMessage]
          : withoutPriorLocalAssistant;

      return [
        ...nextMessages,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          streaming: true
        }
      ];
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientMessageId,
          conversationId,
          message
        })
      });

      if (!response.ok) {
        const payload = await safeJson(response);
        throw new Error(payload?.error?.message ?? "Assistant request failed");
      }

      const resolvedConversationId = response.headers.get("x-conversation-id") ?? conversationId;

      if (resolvedConversationId) {
        setConversationId(resolvedConversationId);
      }

      if (!response.body) {
        throw new Error("Assistant stream was empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let buffer = "";
      let streamFinished = false;

      const updateAssistantText = (text: string, streaming: boolean) => {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantMessageId
              ? { ...currentMessage, content: text, streaming }
              : currentMessage
          )
        );
      };

      const processStreamEvent = (event: ChatStreamEvent) => {
        if (event.type === "start" || event.type === "finish") {
          setConversationId(event.conversationId);

          if (event.type === "finish") {
            streamFinished = true;
            updateAssistantText(assistantText, false);
          }

          return;
        }

        if (event.type === "text_delta") {
          assistantText += event.text;
          updateAssistantText(assistantText, true);
          return;
        }

        if (event.type === "tool_call") {
          const toolMessageId = toolMessageIdFor(clientMessageId, event.toolCallId);

          setMessages((currentMessages) => {
            const existingToolMessage = currentMessages.find(
              (currentMessage) => currentMessage.id === toolMessageId
            );

            if (existingToolMessage) {
              return currentMessages.map((currentMessage) =>
                currentMessage.id === toolMessageId
                  ? {
                      ...currentMessage,
                      toolError: null,
                      toolLoading: true,
                      toolName: event.toolName
                    }
                  : currentMessage
              );
            }

            return [
              ...currentMessages,
              {
                id: toolMessageId,
                role: "assistant",
                content: "",
                toolLoading: true,
                toolName: event.toolName
              }
            ];
          });
          return;
        }

        if (event.type === "tool_result") {
          const toolMessageId = toolMessageIdFor(clientMessageId, event.toolCallId);

          setMessages((currentMessages) => {
            const existingToolMessage = currentMessages.find(
              (currentMessage) => currentMessage.id === toolMessageId
            );

            if (existingToolMessage) {
              return currentMessages.map((currentMessage) =>
                currentMessage.id === toolMessageId
                  ? {
                      ...currentMessage,
                      toolError: null,
                      toolLoading: false,
                      toolName: event.toolName,
                      toolResultsJson: event.result
                    }
                  : currentMessage
              );
            }

            return [
              ...currentMessages,
              {
                id: toolMessageId,
                role: "assistant",
                content: "",
                toolLoading: false,
                toolName: event.toolName,
                toolResultsJson: event.result
              }
            ];
          });
          return;
        }

        if (event.type === "tool_error") {
          const toolMessageId = toolMessageIdFor(clientMessageId, event.toolCallId ?? "error");

          setMessages((currentMessages) => [
            ...currentMessages.filter((currentMessage) => currentMessage.id !== toolMessageId),
            {
              id: toolMessageId,
              role: "assistant",
              content: "",
              toolError: event.message,
              toolLoading: false,
              toolName: event.toolName
            }
          ]);
        }
      };

      const processLine = (line: string) => {
        if (!line.trim()) {
          return;
        }

        try {
          const parsed = JSON.parse(line) as unknown;

          if (isChatStreamEvent(parsed)) {
            processStreamEvent(parsed);
            return;
          }
        } catch {
          // Backward-compatible fallback for plain text streams.
        }

        assistantText += line;
        updateAssistantText(assistantText, true);
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        lines.forEach(processLine);
      }

      buffer += decoder.decode();
      processLine(buffer);
      updateAssistantText(assistantText, false);

      await refreshConversations();

      if (resolvedConversationId && streamFinished) {
        await loadConversation(resolvedConversationId);
      }
    } catch (streamError) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) =>
            currentMessage.id !== assistantMessageId &&
            !currentMessage.id.startsWith(`local-tool-${clientMessageId}-`)
        )
      );
      setError({
        message: streamError instanceof Error ? streamError.message : "Assistant request failed",
        retryClientMessageId: clientMessageId,
        retryMessage: message
      });
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, isStreaming, refreshConversations, loadConversation]);

  useEffect(() => {
    const handler = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      const prompt = event.detail?.prompt;
      if (typeof prompt !== "string" || prompt.trim().length === 0) {
        return;
      }

      submitMessage(prompt);
    };

    window.addEventListener("federal-ai-mission-control:quick-prompt", handler);

    return () => {
      window.removeEventListener("federal-ai-mission-control:quick-prompt", handler);
    };
  }, [submitMessage]);

  useEffect(() => {
    let ignore = false;

    async function hydrate() {
      try {
        const loadedConversations = await refreshConversations();
        const firstConversation = loadedConversations[0];

        if (!ignore && firstConversation) {
          await loadConversation(firstConversation.id);
        }
      } catch (loadError) {
        if (!ignore) {
          setError({
            message:
              loadError instanceof Error ? loadError.message : "Unable to load conversations"
          });
        }
      }
    }

    hydrate();

    return () => {
      ignore = true;
    };
  }, [loadConversation, refreshConversations]);

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <DatasetBadge />
              <DisclosureBadge />
              <ProviderBadge provider={provider} />
            </div>
            <h2 className="mt-3 text-lg font-semibold">BI analyst chat</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Ask portfolio questions and receive streaming answers with inline BI components.
            </p>
          </div>
          <Button
            disabled={isStreaming}
            onClick={() => {
              setConversationId(null);
              setMessages([]);
              setError(null);
            }}
            size="sm"
            variant="secondary"
          >
            New analysis
          </Button>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--border)] bg-white/60 p-3 lg:border-b-0 lg:border-r">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Conversations
          </p>
          <p className="mt-1 px-2 text-[11px] leading-5 text-[var(--muted)]">
            {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
          </p>

          <div className="mt-2 max-h-[38vh] space-y-1 overflow-y-auto pr-1">
            {conversations.length === 0 ? (
              <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--panel)] p-3 text-xs leading-5 text-[var(--muted)]">
                Start a chat to create your first analysis.
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={[
                    "w-full rounded-md px-2 py-2 text-left text-sm transition-colors border",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
                    conversation.id === conversationId
                      ? "border-[var(--border-strong)] bg-[var(--soft)] text-[var(--foreground)]"
                      : "border-transparent text-[var(--muted)] hover:bg-[var(--panel)] hover:text-[var(--foreground)]"
                  ].join(" ")}
                  disabled={isStreaming}
                  onClick={() => loadConversation(conversation.id)}
                  type="button"
                >
                  <span className="block truncate font-medium">
                    {conversation.title}
                  </span>
                  <span className="mt-1 block truncate text-[11px]">
                    {conversation.messageCount} messages
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--muted)]">
                    {conversationSnippet(conversation)}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="space-y-4 p-4">
          {error ? (
            <ChatErrorCard
              disabled={isStreaming}
              message={error.message}
              onDismiss={() => setError(null)}
              onRetry={
                error.retryMessage && error.retryClientMessageId
                  ? () =>
                      submitMessage(error.retryMessage ?? "", {
                        appendUser: false,
                        clientMessageId: error.retryClientMessageId
                      })
                  : undefined
              }
            />
          ) : null}

              {isLoadingConversation ? (
                <ChatLoadingState />
              ) : (
                <MessageList
                  isLoading={isStreaming}
                  messages={messages}
                  onFollowupSelect={submitMessage}
                />
              )}

              <ChatInput disabled={isStreaming} onSubmit={submitMessage} />

          {messages.length === 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestedPrompts.slice(0, 4).map((prompt) => (
                <SuggestedPromptCard key={prompt} onSelect={submitMessage} prompt={prompt} />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </Card>
  );
}

async function safeJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function createClientMessageId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function toolMessageIdFor(clientMessageId: string, toolCallId: string) {
  return `local-tool-${clientMessageId}-${toolCallId}`;
}

function isChatStreamEvent(value: unknown): value is ChatStreamEvent {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  if (value.type === "start" || value.type === "finish") {
    return typeof value.conversationId === "string";
  }

  if (value.type === "text_delta") {
    return typeof value.text === "string";
  }

  if (value.type === "tool_call") {
    return typeof value.toolCallId === "string" && typeof value.toolName === "string";
  }

  if (value.type === "tool_result") {
    return typeof value.toolCallId === "string" && typeof value.toolName === "string";
  }

  if (value.type === "tool_error") {
    return typeof value.message === "string";
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
