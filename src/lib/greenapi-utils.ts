import type { GreenApiWebhook, GreenApiMessageData } from "@/types/greenapi";
import type { MessageContentType } from "@/types/database";

export function chatIdToPhone(chatId: string): string {
  return chatId.replace(/@c\.us$/, "").replace(/@g\.us$/, "");
}

export function normalizeIsraeliPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.startsWith("972")) return digits;
  return digits;
}

export function phoneToWhatsAppChatId(phone: string): string {
  return normalizeIsraeliPhone(phone) + "@c.us";
}

export function extractMessageContent(
  messageData: GreenApiMessageData,
): string | null {
  const { typeMessage } = messageData;

  if (typeMessage === "textMessage") {
    return messageData.textMessageData?.textMessage ?? null;
  }
  if (typeMessage === "extendedTextMessage") {
    return messageData.extendedTextMessageData?.text ?? null;
  }
  if (typeMessage === "imageMessage") {
    return messageData.imageMessageData?.caption ?? null;
  }
  if (typeMessage === "videoMessage") {
    return messageData.videoMessageData?.caption ?? null;
  }
  if (typeMessage === "documentMessage") {
    return messageData.documentMessageData?.caption ?? null;
  }
  if (typeMessage === "audioMessage" || typeMessage === "voiceMessage") {
    return null;
  }
  if (typeMessage === "locationMessage") {
    const loc = messageData.locationMessageData;
    return loc
      ? `${loc.nameLocation ?? ""} ${loc.address ?? ""} (${loc.latitude}, ${loc.longitude})`.trim()
      : null;
  }
  if (typeMessage === "contactMessage") {
    return messageData.contactMessageData?.displayName ?? null;
  }
  if (typeMessage === "pollUpdateMessage") {
    return messageData.pollUpdateMessageData?.vote?.[0] ?? null;
  }
  if (typeMessage === "pollMessage" && messageData.pollMessageData) {
    const poll = messageData.pollMessageData;
    if (poll.options?.length === 1) return poll.options[0].optionName;
    return null;
  }
  if (typeMessage === "listResponseMessage") {
    return messageData.listResponseMessageData?.singleSelectReply?.selectedRowId ?? null;
  }
  if (typeMessage === "buttonsResponseMessage") {
    return messageData.buttonsResponseMessageData?.selectedButtonId ?? null;
  }
  return null;
}

export function mapMessageType(typeMessage: string): MessageContentType {
  const map: Record<string, MessageContentType> = {
    textMessage: "text",
    extendedTextMessage: "text",
    imageMessage: "image",
    videoMessage: "video",
    audioMessage: "audio",
    voiceMessage: "voice",
    documentMessage: "document",
    locationMessage: "location",
    contactMessage: "contact",
    stickerMessage: "sticker",
    pollMessage: "text",
    pollUpdateMessage: "text",
    listResponseMessage: "text",
    buttonsResponseMessage: "text",
  };
  return map[typeMessage] ?? "other";
}

export type WebhookClassification =
  | "inbound"
  | "outbound_manual"
  | "outbound_api"
  | "status"
  | "unknown";

export function classifyWebhook(typeWebhook: string): WebhookClassification {
  switch (typeWebhook) {
    case "incomingMessageReceived":
      return "inbound";
    case "outgoingMessage":
      return "outbound_manual";
    case "outgoingAPIMessageReceived":
      return "outbound_api";
    case "outgoingMessageStatus":
    case "stateInstanceChanged":
      return "status";
    default:
      return "unknown";
  }
}

export function validateGreenApiPayload(
  body: unknown,
): { valid: true; data: GreenApiWebhook } | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Empty or non-object body" };
  }

  const obj = body as Record<string, unknown>;

  if (!obj.typeWebhook || typeof obj.typeWebhook !== "string") {
    return { valid: false, error: "Missing typeWebhook" };
  }

  if (!obj.instanceData || typeof obj.instanceData !== "object") {
    return { valid: false, error: "Missing instanceData" };
  }

  if (
    obj.typeWebhook === "stateInstanceChanged" ||
    obj.typeWebhook === "outgoingMessageStatus"
  ) {
    return { valid: true, data: body as GreenApiWebhook };
  }

  if (!obj.senderData || typeof obj.senderData !== "object") {
    return { valid: false, error: "Missing senderData" };
  }

  const sender = obj.senderData as Record<string, unknown>;
  if (!sender.chatId || typeof sender.chatId !== "string") {
    return { valid: false, error: "Missing senderData.chatId" };
  }

  return { valid: true, data: body as GreenApiWebhook };
}
