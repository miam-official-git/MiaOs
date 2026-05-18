import type { GreenApiWebhook } from "@/types/greenapi";
import type { MessageDirection, MessageContentType } from "@/types/database";
import {
  chatIdToPhone,
  extractMessageContent,
  mapMessageType,
} from "./greenapi-utils";
import {
  getContactByChatId,
  upsertContactByWhatsApp,
  saveMessage,
  pauseTriageForChat,
  logActivity,
} from "./supabase-admin";
import { processIncomingForTriage } from "./triage-engine";

export async function handleIncomingMessage(
  webhook: GreenApiWebhook,
): Promise<void> {
  const chatId = webhook.senderData.chatId;
  const phone = chatIdToPhone(chatId);
  const senderName = webhook.senderData.chatName || undefined;
  const content = extractMessageContent(webhook.messageData);
  const messageType = mapMessageType(webhook.messageData.typeMessage);

  // 1. Find or create contact
  let contact = await getContactByChatId(chatId);
  if (!contact) {
    contact = await upsertContactByWhatsApp({
      chat_id: chatId,
      phone,
      sender_name: senderName,
    });
  }

  // 2. Save message
  const message = await saveMessage({
    contact_id: contact.id,
    direction: "inbound" as MessageDirection,
    message_type: messageType as MessageContentType,
    content,
    sender_phone: phone,
    sender_name: senderName ?? null,
    chat_id: chatId,
    greenapi_id_message: webhook.idMessage,
    metadata: {},
  });

  // 3. Log activity
  await logActivity("message", message.id, "message_received", "bot", {
    chat_id: chatId,
    message_type: messageType,
    contact_id: contact.id,
  });

  // 4. Delegate to triage engine
  await processIncomingForTriage(chatId, contact.id, content);
}

export async function handleOutgoingManual(
  webhook: GreenApiWebhook,
): Promise<void> {
  const chatId = webhook.senderData.chatId;
  const content = extractMessageContent(webhook.messageData);
  const messageType = mapMessageType(webhook.messageData.typeMessage);

  // Find contact (may not exist if Omer messages someone new)
  const contact = await getContactByChatId(chatId);

  // Save message
  await saveMessage({
    contact_id: contact?.id ?? null,
    direction: "outbound" as MessageDirection,
    message_type: messageType as MessageContentType,
    content,
    sender_phone: null,
    sender_name: null,
    chat_id: chatId,
    greenapi_id_message: webhook.idMessage,
    metadata: { source: "manual" },
  });

  // Pause triage for this chat — Omer/Mia is handling it manually
  await pauseTriageForChat(chatId);
}

export async function handleOutgoingApi(
  webhook: GreenApiWebhook,
): Promise<void> {
  const chatId = webhook.senderData.chatId;
  const content = extractMessageContent(webhook.messageData);
  const messageType = mapMessageType(webhook.messageData.typeMessage);

  const contact = await getContactByChatId(chatId);

  await saveMessage({
    contact_id: contact?.id ?? null,
    direction: "outbound" as MessageDirection,
    message_type: messageType as MessageContentType,
    content,
    sender_phone: null,
    sender_name: null,
    chat_id: chatId,
    greenapi_id_message: webhook.idMessage,
    metadata: { source: "api" },
  });
}
