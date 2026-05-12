import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  apiError,
  databaseError,
  getMessageInputs,
  parseJsonBody,
  sanitizeTitle,
  type SanitizedMessageInput,
  serializeConversation,
  titleFromFirstUserMessage
} from "@/lib/chat/conversations";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

type ConversationRouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: ConversationRouteContext) {
  const { id } = await context.params;

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!conversation) {
      return apiError("NOT_FOUND", "Conversation not found", 404);
    }

    return NextResponse.json({
      ok: true,
      conversation: serializeConversation(conversation)
    });
  } catch (error) {
    return databaseError(error);
  }
}

export async function PATCH(request: Request, context: ConversationRouteContext) {
  const { id } = await context.params;
  const parsedBody = await parseJsonBody(request);

  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  let messages: SanitizedMessageInput[];
  try {
    messages = getMessageInputs(parsedBody.data);
  } catch (error) {
    return apiError(
      "INVALID_MESSAGE",
      error instanceof Error ? error.message : "Invalid message payload"
    );
  }

  const explicitTitle = sanitizeTitle(parsedBody.data.title);

  try {
    const conversation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingConversation = await tx.conversation.findUnique({
        where: { id },
        include: {
          messages: {
            where: { role: "user" },
            orderBy: { createdAt: "asc" },
            take: 1
          }
        }
      });

      if (!existingConversation) {
        return null;
      }

      const shouldDeriveTitle =
        explicitTitle === null &&
        existingConversation.messages.length === 0 &&
        messages.some((message) => message.role === "user");
      const derivedTitle = shouldDeriveTitle ? titleFromFirstUserMessage(messages) : null;
      const nextTitle = explicitTitle ?? derivedTitle;

      if (nextTitle) {
        await tx.conversation.update({
          where: { id },
          data: { title: nextTitle }
        });
      }

      for (const message of messages) {
        await tx.message.create({
          data: {
            conversationId: id,
            role: message.role,
            content: message.content,
            partsJson: message.partsJson,
            toolResultsJson: message.toolResultsJson
          }
        });
      }

      if (messages.length > 0 && !nextTitle) {
        await tx.conversation.update({
          where: { id },
          data: { updatedAt: new Date() }
        });
      }

      return tx.conversation.findUnique({
        where: { id },
        include: {
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: "asc" } }
        }
      });
    });

    if (!conversation) {
      return apiError("NOT_FOUND", "Conversation not found", 404);
    }

    return NextResponse.json({
      ok: true,
      conversation: serializeConversation(conversation)
    });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(_request: Request, context: ConversationRouteContext) {
  const { id } = await context.params;

  try {
    const existingConversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!existingConversation) {
      return apiError("NOT_FOUND", "Conversation not found", 404);
    }

    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversationId: id } }),
      prisma.conversation.delete({ where: { id } })
    ]);

    return NextResponse.json({
      ok: true,
      deletedConversationId: id
    });
  } catch (error) {
    return databaseError(error);
  }
}
