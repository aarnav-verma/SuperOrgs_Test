import type { Prisma } from "@prisma/client";
import { stepCountIs, streamText } from "ai";
import { NextResponse } from "next/server";

import { getModelFromConfig, validateProviderEnv } from "@/lib/ai/provider";
import { FEDERAL_AI_MISSION_CONTROL_SYSTEM_PROMPT } from "@/lib/ai/systemPrompt";
import { federalAiMissionControlTools } from "@/lib/ai/tools";
import {
  DEFAULT_CONVERSATION_TITLE,
  apiError,
  databaseError,
  normalizeWhitespace
} from "@/lib/chat/conversations";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ChatRequestBody = {
  clientMessageId?: unknown;
  conversationId?: unknown;
  message?: unknown;
};

type ModelMessage = {
  role: "user" | "assistant";
  content: string;
};

type PersistedChatMessage = {
  role: string;
  content: string;
  toolResultsJson: unknown;
};

type ExistingClientMessage = {
  id: string;
  conversationId: string;
};

type ToolCallSummary = {
  toolCallId: string;
  toolName: string;
};

type StreamEvent =
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

export async function POST(request: Request) {
  const provider = validateProviderEnv();

  if (!provider.ok) {
    return apiError("PROVIDER_MISCONFIGURED", provider.error, 400);
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return apiError("INVALID_JSON", "Invalid JSON request body");
  }

  const userContent = normalizeUserMessage(body.message);

  if (!userContent) {
    return apiError("INVALID_MESSAGE", "A non-empty user message is required");
  }

  const requestedConversationId =
    typeof body.conversationId === "string" && body.conversationId.trim().length > 0
      ? body.conversationId.trim()
      : null;
  const clientMessageId =
    typeof body.clientMessageId === "string" && body.clientMessageId.trim().length > 0
      ? body.clientMessageId.trim().slice(0, 120)
      : null;

  let conversationId: string;

  try {
    conversationId = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingUserMessage: ExistingClientMessage | null = clientMessageId
        ? await tx.message.findFirst({
            where: {
              role: "user",
              ...(requestedConversationId ? { conversationId: requestedConversationId } : {}),
              partsJson: {
                path: ["clientMessageId"],
                equals: clientMessageId
              }
            },
            select: {
              id: true,
              conversationId: true
            }
          })
        : null;

      if (existingUserMessage) {
        return existingUserMessage.conversationId;
      }

      const conversation = requestedConversationId
        ? await tx.conversation.findUnique({
            where: { id: requestedConversationId },
            include: {
              messages: {
                where: { role: "user" },
                orderBy: { createdAt: "asc" },
                take: 1
              }
            }
          })
        : await tx.conversation.create({
            data: {
              title: titleFromMessage(userContent) ?? DEFAULT_CONVERSATION_TITLE
            },
            include: {
              messages: true
            }
          });

      if (!conversation) {
        throw new ConversationNotFoundError();
      }

      const shouldUpdateTitle =
        conversation.title === DEFAULT_CONVERSATION_TITLE && conversation.messages.length === 0;

      if (shouldUpdateTitle) {
        await tx.conversation.update({
          where: { id: conversation.id },
          data: { title: titleFromMessage(userContent) ?? DEFAULT_CONVERSATION_TITLE }
        });
      }

      await tx.message.create({
        data: {
          conversationId: conversation.id,
          role: "user",
          content: userContent,
          partsJson: clientMessageId ? { clientMessageId } : undefined
        }
      });

      return conversation.id;
    });
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return apiError("NOT_FOUND", "Conversation not found", 404);
    }

    return databaseError(error);
  }

  if (clientMessageId) {
    try {
      const existingAssistant = await prisma.message.findFirst({
        where: {
          conversationId,
          role: "assistant",
          partsJson: {
            path: ["responseToClientMessageId"],
            equals: clientMessageId
          }
        },
        orderBy: { createdAt: "desc" }
      });

      if (existingAssistant) {
        return streamReplayResponse(
          conversationId,
          existingAssistant.content,
          existingAssistant.toolResultsJson
        );
      }
    } catch (error) {
      return databaseError(error);
    }
  }

  let messages: ModelMessage[];
  try {
    const persistedMessages: PersistedChatMessage[] = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" }
    });

    messages = persistedMessages
      .filter(
        (message: PersistedChatMessage) =>
          message.role === "user" || message.role === "assistant"
      )
      .map((message: PersistedChatMessage) => ({
        role: message.role as "user" | "assistant",
        content: modelHistoryContent(message)
      }));
  } catch (error) {
    return databaseError(error);
  }

  try {
    const result = streamText({
      model: getModelFromConfig(),
      system: FEDERAL_AI_MISSION_CONTROL_SYSTEM_PROMPT,
      messages,
      tools: federalAiMissionControlTools,
      stopWhen: stepCountIs(6)
    });

    return streamToolAwareResponse({
      clientMessageId,
      conversationId,
      fullStream: result.fullStream
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "LLM_STREAM_ERROR",
          message: "Failed to start assistant stream",
          details: error instanceof Error ? error.message : "Unknown model error"
        }
      },
      { status: 500 }
    );
  }
}

function streamReplayResponse(conversationId: string, content: string, toolResultsJson: unknown) {
  const toolResults = normalizePersistedToolResults(toolResultsJson);

  return createNdjsonResponse(
    async (send) => {
      send({ type: "start", conversationId });

      toolResults.forEach((result, index) => {
        send({
          type: "tool_result",
          toolCallId: `replay-${index}`,
          toolName: toolNameForPayload(result),
          result
        });
      });

      if (content) {
        const words = content.split(/(\s+)/);
        for (const word of words) {
          if (word) {
            send({ type: "text_delta", text: word });
            await new Promise<void>((resolve) => setTimeout(resolve, 18));
          }
        }
      }

      send({ type: "finish", conversationId });
    },
    {
      "x-chat-replayed": "true",
      "x-conversation-id": conversationId
    }
  );
}

function streamToolAwareResponse({
  clientMessageId,
  conversationId,
  fullStream
}: {
  clientMessageId: string | null;
  conversationId: string;
  fullStream: AsyncIterable<unknown>;
}) {
  return createNdjsonResponse(
    async (send) => {
      let assistantText = "";
      const toolResults: unknown[] = [];
      const toolCalls: ToolCallSummary[] = [];

      send({ type: "start", conversationId });

      try {
        for await (const rawPart of fullStream) {
          const part = normalizeStreamPart(rawPart);

          if (part.type === "text-delta") {
            const textDelta = readString(part, ["text", "textDelta", "delta"]);

            if (textDelta) {
              assistantText += textDelta;
              send({ type: "text_delta", text: textDelta });
            }

            continue;
          }

          if (isToolCallPart(part)) {
            const toolCallId = readString(part, ["toolCallId", "id"]) ?? `tool-${toolCalls.length + 1}`;
            const toolName = readString(part, ["toolName", "name"]) ?? "BI tool";

            if (!toolCalls.some((call) => call.toolCallId === toolCallId)) {
              toolCalls.push({ toolCallId, toolName });
              send({ type: "tool_call", toolCallId, toolName });
            }

            continue;
          }

          if (isToolResultPart(part)) {
            const toolCallId = readString(part, ["toolCallId", "id"]) ?? `tool-${toolResults.length + 1}`;
            const toolName = readString(part, ["toolName", "name"]) ?? "BI tool";
            const output = readValue(part, ["output", "result"]);

            if (isRenderableToolPayload(output)) {
              toolResults.push(output);
              send({ type: "tool_result", toolCallId, toolName, result: output });
            }

            continue;
          }

          if (part.type === "error") {
            send({
              type: "tool_error",
              message: errorMessage(readValue(part, ["error"]))
            });
          }
        }

        await persistAssistantMessage({
          assistantText,
          clientMessageId,
          conversationId,
          toolCalls,
          toolResults
        });

        send({ type: "finish", conversationId });
      } catch (error) {
        send({
          type: "tool_error",
          message: error instanceof Error ? error.message : "Assistant stream failed"
        });
      }
    },
    {
      "x-conversation-id": conversationId
    }
  );
}

async function persistAssistantMessage({
  assistantText,
  clientMessageId,
  conversationId,
  toolCalls,
  toolResults
}: {
  assistantText: string;
  clientMessageId: string | null;
  conversationId: string;
  toolCalls: ToolCallSummary[];
  toolResults: unknown[];
}) {
  const existingAssistant = clientMessageId
    ? await prisma.message.findFirst({
        where: {
          conversationId,
          role: "assistant",
          partsJson: {
            path: ["responseToClientMessageId"],
            equals: clientMessageId
          }
        },
        select: { id: true }
      })
    : null;

  if (existingAssistant) {
    return;
  }

  await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: assistantText,
      partsJson: {
        ...(clientMessageId ? { responseToClientMessageId: clientMessageId } : {}),
        ...(toolCalls.length > 0 ? { toolCalls } : {})
      } as Prisma.InputJsonValue,
      toolResultsJson:
        toolResults.length > 0 ? (toolResults as Prisma.InputJsonValue) : undefined
    }
  });
}

function createNdjsonResponse(
  producer: (send: (event: StreamEvent) => void) => Promise<void>,
  headers: Record<string, string> = {}
) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        await producer(send);
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "cache-control": "no-store",
      "content-type": "application/x-ndjson; charset=utf-8",
      ...headers
    }
  });
}

function normalizePersistedToolResults(value: unknown) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter(isRenderableToolPayload);
  }

  return isRenderableToolPayload(value) ? [value] : [];
}

function normalizeStreamPart(rawPart: unknown): Record<string, unknown> & { type: string } {
  if (typeof rawPart === "object" && rawPart !== null && "type" in rawPart) {
    const part = rawPart as Record<string, unknown>;
    return {
      ...part,
      type: String(part.type)
    };
  }

  return { type: "unknown" };
}

function isToolCallPart(part: { type: string }) {
  return [
    "tool-call",
    "tool-call-streaming-start",
    "tool-input-start",
    "tool-input-available"
  ].includes(part.type);
}

function isToolResultPart(part: { type: string }) {
  return ["tool-result", "tool-output-available"].includes(part.type);
}

function readString(part: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = part[key];

    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

function readValue(part: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in part) {
      return part[key];
    }
  }

  return null;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "A BI tool call failed. You can adjust the request and try again.";
}

function toolNameForPayload(payload: unknown) {
  if (!isRecord(payload) || typeof payload.componentType !== "string") {
    return "BI tool";
  }

  const toolNames: Record<string, string> = {
    mission_control: "getMissionControlSnapshot",
    breakdown: "getInventoryBreakdown",
    risk_command_center: "getRiskCommandCenter",
    cots_adoption: "getCotsAdoption",
    cost_intelligence: "getCostIntelligence",
    use_case_search: "searchUseCases",
    adoption_governance_matrix: "getAdoptionGovernanceMatrix",
    followup_suggestions: "getFollowupSuggestions"
  };

  return toolNames[payload.componentType] ?? "BI tool";
}

function modelHistoryContent(message: PersistedChatMessage) {
  if (message.role !== "assistant") {
    return message.content;
  }

  const toolSummary = summarizePersistedToolResults(message.toolResultsJson);
  if (!toolSummary) {
    return message.content;
  }

  return [message.content, "Prior rendered BI outputs:", toolSummary].filter(Boolean).join("\n\n");
}

function summarizePersistedToolResults(value: unknown) {
  const payloads = normalizePersistedToolResults(value);

  if (payloads.length === 0) {
    return "";
  }

  return payloads.map(summarizeToolPayload).filter(Boolean).join("\n");
}

function summarizeToolPayload(payload: unknown) {
  if (!isRecord(payload) || typeof payload.componentType !== "string") {
    return "";
  }

  const title = readString(payload, ["title"]) ?? payload.componentType;
  const kpis = summarizeKpis(payload.kpis);
  const rows = summarizeRows(payload.rows ?? payload.data);

  return [`- ${title}`, kpis ? `  KPIs: ${kpis}` : "", rows ? `  Top rows: ${rows}` : ""]
    .filter(Boolean)
    .join("\n");
}

function summarizeKpis(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .slice(0, 6)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const label = readString(item, ["label"]);
      const rawValue = item.value;
      const renderedValue =
        typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : null;

      return label && renderedValue ? `${label}: ${renderedValue}` : null;
    })
    .filter(Boolean)
    .join("; ");
}

function summarizeRows(value: unknown) {
  if (!Array.isArray(value)) {
    return "";
  }

  return value
    .slice(0, 8)
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const label =
        readString(item, ["label", "useCaseName", "agency", "product", "useCase"]) ?? "row";
      const rawValue = item.value ?? item.systems ?? item.riskScore ?? item.estimatedMonthlyCost;
      const renderedValue =
        typeof rawValue === "string" || typeof rawValue === "number" ? String(rawValue) : null;

      return renderedValue ? `${label} (${renderedValue})` : label;
    })
    .filter(Boolean)
    .join("; ");
}

function isRenderableToolPayload(value: unknown) {
  return (
    isRecord(value) &&
    typeof value.componentType === "string" &&
    [
      "mission_control",
      "breakdown",
      "risk_command_center",
      "cots_adoption",
      "cost_intelligence",
      "use_case_search",
      "adoption_governance_matrix",
      "followup_suggestions"
    ].includes(value.componentType)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

class ConversationNotFoundError extends Error {
  constructor() {
    super("Conversation not found");
  }
}

function normalizeUserMessage(message: unknown) {
  if (typeof message === "string") {
    const normalized = normalizeWhitespace(message);
    return normalized.length > 0 ? normalized : null;
  }

  if (
    typeof message === "object" &&
    message !== null &&
    "content" in message &&
    typeof message.content === "string"
  ) {
    const normalized = normalizeWhitespace(message.content);
    return normalized.length > 0 ? normalized : null;
  }

  return null;
}

function titleFromMessage(message: string) {
  const normalized = normalizeWhitespace(message);
  return normalized.length > 0 ? normalized.slice(0, 60) : null;
}
