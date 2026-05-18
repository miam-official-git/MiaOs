// ============================================================
// Mia-OS: Green API (WhatsApp Web Automation) Types
// Docs: https://green-api.com/en/docs/api/receiving/
// ============================================================

export type GreenApiWebhookType =
  | 'incomingMessageReceived'
  | 'outgoingMessage'
  | 'outgoingAPIMessageReceived'
  | 'outgoingMessageStatus'
  | 'stateInstanceChanged';

export interface GreenApiInstanceData {
  idInstance: number;
  wid: string;
  typeInstance: string;
}

export interface GreenApiSenderData {
  chatId: string;
  chatName: string;
  sender: string;
}

export interface GreenApiTextMessageData {
  textMessage: string;
}

export interface GreenApiExtendedTextMessageData {
  text: string;
  description?: string;
  title?: string;
  previewType?: string;
  jpegThumbnail?: string;
}

export interface GreenApiImageMessageData {
  downloadUrl: string;
  caption?: string;
  jpegThumbnail?: string;
  mimeType?: string;
}

export interface GreenApiAudioMessageData {
  downloadUrl: string;
  mimeType?: string;
  isForwarded?: boolean;
}

export interface GreenApiVideoMessageData {
  downloadUrl: string;
  caption?: string;
  mimeType?: string;
}

export interface GreenApiDocumentMessageData {
  downloadUrl: string;
  fileName?: string;
  mimeType?: string;
  caption?: string;
}

export interface GreenApiLocationMessageData {
  latitude: number;
  longitude: number;
  nameLocation?: string;
  address?: string;
  jpegThumbnail?: string;
}

export interface GreenApiContactMessageData {
  displayName: string;
  vcard: string;
}

export interface GreenApiPollMessageData {
  name: string;
  options: { optionName: string }[];
  multipleAnswers: boolean;
  stanzaId?: string;
}

export interface GreenApiPollUpdateMessageData {
  stanzaId: string;
  senderTimestamp?: number;
  pollCreationMessageKey?: string;
  vote: string[];
}

export interface GreenApiListResponseMessageData {
  title: string;
  listType?: number;
  singleSelectReply: { selectedRowId: string };
  stanzaId?: string;
}

export interface GreenApiButtonsResponseMessageData {
  selectedButtonId: string;
  selectedButtonText?: string;
  stanzaId?: string;
}

export interface GreenApiMessageData {
  typeMessage: string;
  textMessageData?: GreenApiTextMessageData;
  extendedTextMessageData?: GreenApiExtendedTextMessageData;
  imageMessageData?: GreenApiImageMessageData;
  audioMessageData?: GreenApiAudioMessageData;
  videoMessageData?: GreenApiVideoMessageData;
  documentMessageData?: GreenApiDocumentMessageData;
  locationMessageData?: GreenApiLocationMessageData;
  contactMessageData?: GreenApiContactMessageData;
  stickerMessageData?: { downloadUrl: string; mimeType?: string };
  pollMessageData?: GreenApiPollMessageData;
  pollUpdateMessageData?: GreenApiPollUpdateMessageData;
  listResponseMessageData?: GreenApiListResponseMessageData;
  buttonsResponseMessageData?: GreenApiButtonsResponseMessageData;
}

export interface GreenApiWebhook {
  typeWebhook: GreenApiWebhookType;
  instanceData: GreenApiInstanceData;
  timestamp: number;
  idMessage: string;
  senderData: GreenApiSenderData;
  messageData: GreenApiMessageData;
}

export interface GreenApiSendResponse {
  idMessage: string;
}
