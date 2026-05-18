import { NextRequest } from "next/server";
import { chatIdToPhone } from "@/lib/greenapi-utils";
import {
  getContactByChatId,
  upsertContactByWhatsApp,
  saveMessage,
  getRecentMessages,
} from "@/lib/supabase-admin";
import { processIncomingForTriage } from "@/lib/triage-engine";
import { botMessageToText } from "@/lib/greenapi-client";
import type { MessageDirection, MessageContentType } from "@/types/database";

function generateMessageId() {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  try {
    const { message, chatId, senderName } = await request.json();

    if (!message || !chatId) {
      return Response.json({ error: "message and chatId required" }, { status: 400 });
    }

    const phone = chatIdToPhone(chatId);

    // 1. Find or create contact
    let contact = await getContactByChatId(chatId);
    if (!contact) {
      contact = await upsertContactByWhatsApp({
        chat_id: chatId,
        phone,
        sender_name: senderName || phone,
      });
    }

    // 2. Save the incoming message
    await saveMessage({
      contact_id: contact.id,
      direction: "inbound" as MessageDirection,
      message_type: "text" as MessageContentType,
      content: message,
      sender_phone: phone,
      sender_name: senderName || null,
      chat_id: chatId,
      greenapi_id_message: generateMessageId(),
      metadata: { source: "simulator" },
    });

    // 3. Run triage engine
    const { botResponses } = await processIncomingForTriage(chatId, contact.id, message);

    // 4. Save bot responses and build response payload
    const responsesPayload = [];
    for (const msg of botResponses) {
      const textContent = botMessageToText(msg);
      await saveMessage({
        contact_id: contact.id,
        direction: "outbound" as MessageDirection,
        message_type: "text" as MessageContentType,
        content: textContent,
        sender_phone: null,
        sender_name: "Mia-OS Bot",
        chat_id: chatId,
        greenapi_id_message: generateMessageId(),
        metadata: { source: "simulator" },
      });
      responsesPayload.push({
        text: msg.text,
        buttons: msg.buttons ?? null,
      });
    }

    // 5. Re-fetch contact (name may have been updated by triage)
    const updatedContact = await getContactByChatId(chatId);

    return Response.json({
      success: true,
      botResponses: responsesPayload,
      contact: {
        id: (updatedContact ?? contact).id,
        name: (updatedContact ?? contact).full_name,
        phone: (updatedContact ?? contact).phone,
      },
    });
  } catch (error) {
    console.error("[simulator] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const chatId = request.nextUrl.searchParams.get("chatId");
  if (!chatId) {
    return Response.json({ error: "chatId required" }, { status: 400 });
  }

  try {
    const messages = await getRecentMessages(chatId, 50);
    return Response.json({ messages: messages.reverse() });
  } catch (error) {
    console.error("[simulator] GET error:", error);
    return Response.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
