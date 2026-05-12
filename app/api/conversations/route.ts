import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  DEFAULT_CONVERSATION_TITLE,
  apiError,
  databaseError,
  getMessageInputs,
  parseJsonBody,
  sanitizeTitle,
  type SanitizedMessageInput,
  serializeConversation,
  serializeConversationSummary,
  titleFromFirstUserMessage
} from "@/lib/chat/conversations";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    });

    return NextResponse.json({
      ok: true,
      conversations: conversations.map(serializeConversationSummary)
    });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
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
  const firstUserMessageTitle = titleFromFirstUserMessage(messages);
  const title = explicitTitle ?? firstUserMessageTitle ?? DEFAULT_CONVERSATION_TITLE;

  try {
    const conversation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdConversation = await tx.conversation.create({
        data: { title }
      });

      for (const message of messages) {
        await tx.message.create({
          data: {
            conversationId: createdConversation.id,
            role: message.role,
            content: message.content,
            partsJson: message.partsJson,
            toolResultsJson: message.toolResultsJson
          }
        });
      }

      return tx.conversation.findUniqueOrThrow({
        where: { id: createdConversation.id },
        include: {
          _count: { select: { messages: true } },
          messages: { orderBy: { createdAt: "asc" } }
        }
      });
    });

    return NextResponse.json(
      {
        ok: true,
        conversation: serializeConversation(conversation)
      },
      { status: 201 }
    );
  } catch (error) {
    return databaseError(error);
  }
}
