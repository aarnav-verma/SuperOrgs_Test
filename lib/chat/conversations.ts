import type { Conversation, Message, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const DEFAULT_CONVERSATION_TITLE = "New analysis";

const VALID_MESSAGE_ROLES = new Set(["user", "assistant", "system", "tool"]);

type ParsedBody =
  | {
      ok: true;
      data: Record<string, unknown>;
    }
  | {
      ok: false;
      response: NextResponse;
    };

export type SanitizedMessageInput = {
  role: string;
  content: string;
  partsJson?: Prisma.InputJsonValue;
  toolResultsJson?: Prisma.InputJsonValue;
};

export function apiError(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        details: details ?? null
      }
    },
    { status }
  );
}

export function databaseError(error: unknown) {
  return apiError(
    "DATABASE_ERROR",
    "Database request failed",
    500,
    error instanceof Error ? error.message : "Unknown database error"
  );
}

export async function parseJsonBody(request: Request): Promise<ParsedBody> {
  try {
    const text = await request.text();

    if (!text.trim()) {
      return { ok: true, data: {} };
    }

    const parsed = JSON.parse(text);

    if (!isRecord(parsed)) {
      return {
        ok: false,
        response: apiError("INVALID_JSON", "Request body must be a JSON object")
      };
    }

    return { ok: true, data: parsed };
  } catch {
    return {
      ok: false,
      response: apiError("INVALID_JSON", "Invalid JSON request body")
    };
  }
}

export function serializeMessage(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    partsJson: message.partsJson ?? null,
    toolResultsJson: message.toolResultsJson ?? null,
    createdAt: message.createdAt.toISOString()
  };
}

export function serializeConversation(
  conversation: Conversation & {
    messages?: Message[];
    _count?: { messages: number };
  }
) {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count?.messages ?? conversation.messages?.length ?? 0,
    messages: conversation.messages?.map(serializeMessage) ?? undefined
  };
}

export function serializeConversationSummary(
  conversation: Conversation & {
    messages: Message[];
    _count: { messages: number };
  }
) {
  const lastMessage = conversation.messages[0];

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    messageCount: conversation._count.messages,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          role: lastMessage.role,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt.toISOString()
        }
      : null
  };
}

export function sanitizeTitle(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
}

export function titleFromFirstUserMessage(messages: SanitizedMessageInput[]) {
  const firstUserMessage = messages.find((message) => message.role === "user");

  if (!firstUserMessage) {
    return null;
  }

  const normalized = normalizeWhitespace(firstUserMessage.content);
  return normalized.length > 0 ? normalized.slice(0, 60) : null;
}

export function getMessageInputs(body: Record<string, unknown>) {
  const rawMessages = Array.isArray(body.messages)
    ? body.messages
    : isRecord(body.message)
      ? [body.message]
      : typeof body.content === "string" || typeof body.role === "string"
        ? [body]
        : [];

  return rawMessages.map(sanitizeMessageInput);
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeMessageInput(rawMessage: unknown): SanitizedMessageInput {
  if (!isRecord(rawMessage)) {
    throw new Error("Each message must be a JSON object");
  }

  const role = typeof rawMessage.role === "string" ? rawMessage.role : "";
  if (!VALID_MESSAGE_ROLES.has(role)) {
    throw new Error("Message role must be one of: user, assistant, system, tool");
  }

  if (typeof rawMessage.content !== "string") {
    throw new Error("Message content must be a string");
  }

  const partsJson = jsonField(rawMessage.partsJson ?? rawMessage.parts);
  const toolResultsJson = jsonField(rawMessage.toolResultsJson ?? rawMessage.toolResults);

  return {
    role,
    content: rawMessage.content,
    ...(partsJson === undefined ? {} : { partsJson }),
    ...(toolResultsJson === undefined ? {} : { toolResultsJson })
  };
}

function jsonField(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
