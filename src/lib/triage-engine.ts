import {
  getActiveTriageSession,
  createTriageSession,
  updateTriageSessionStatus,
  updateTriageSessionLanguage,
  updateTriageSessionService,
  updateTriageSessionStep,
  completeTriageSession,
  isTriagePaused,
  isNewWhatsAppContact,
  upsertContactByWhatsApp,
  updateContactName,
  createLead,
  logActivity,
  getLatestLeadForContact,
  appendLeadNotes,
  checkCalendarConflicts,
} from "./supabase-admin";
import {
  sendBotMessage,
  getWelcomeMessage,
  getAskNameMessage,
  getServiceMenuMessage,
  getRetryServiceMessage,
  getRetryDateMessage,
  getDateDisambiguationMessage,
  parseLanguageSelection,
  parseTriageResponse,
  parseDateInput,
  formatDateHebrew,
  formatDateEnglish,
  type BotMessage,
} from "./greenapi-client";
import {
  getServiceFlow,
  matchButtonAnswer,
  parseSourceFromAnswer,
  type CollectedData,
} from "./triage-flows";
import { chatIdToPhone } from "./greenapi-utils";
import type { LeadType, TriageLanguage, TriageSessionStatus, SourcePlatform } from "@/types/database";

export interface TriageResult {
  botResponses: BotMessage[];
}

export async function processIncomingForTriage(
  chatId: string,
  contactId: string,
  messageContent: string | null,
): Promise<TriageResult> {
  const botResponses: BotMessage[] = [];

  if (await isTriagePaused(chatId)) {
    return { botResponses };
  }

  const session = await getActiveTriageSession(chatId);

  if (session) {
    const status = session.status as TriageSessionStatus;
    const lang = (session.language as TriageLanguage) || "he";

    if (status === "awaiting_language") {
      await handleLanguageStep(session.id, chatId, messageContent, botResponses);
    } else if (status === "awaiting_name") {
      await handleNameStep(session.id, chatId, contactId, lang, messageContent, botResponses);
    } else if (status === "awaiting_response") {
      await handleServiceStep(session.id, chatId, lang, messageContent, botResponses);
    } else if (status === "collecting_details") {
      await handleDetailsStep(
        session.id, chatId, contactId, lang,
        session.selected_service as LeadType,
        session.current_step,
        session.collected_data as CollectedData,
        messageContent, botResponses,
      );
    }
    return { botResponses };
  }

  if (!(await isNewWhatsAppContact(contactId))) {
    if (messageContent) {
      try {
        const lead = await getLatestLeadForContact(contactId);
        if (lead) {
          await appendLeadNotes(lead.id, messageContent);
        }
      } catch (err) {
        console.error("[triage] Failed to append post-triage note:", err);
      }
    }
    return { botResponses };
  }

  await startTriage(chatId, contactId, botResponses);
  return { botResponses };
}

async function startTriage(
  chatId: string,
  contactId: string,
  botResponses: BotMessage[],
): Promise<void> {
  try {
    await createTriageSession(chatId, contactId, "awaiting_language");
    const welcome = getWelcomeMessage();
    botResponses.push(welcome);
    try { await sendBotMessage(chatId, welcome); } catch {}
  } catch (error) {
    console.error("[triage] Failed to start triage:", error);
  }
}

async function handleLanguageStep(
  sessionId: string,
  chatId: string,
  messageContent: string | null,
  botResponses: BotMessage[],
): Promise<void> {
  if (!messageContent) return;

  const lang = parseLanguageSelection(messageContent);
  if (!lang) {
    const welcome = getWelcomeMessage();
    botResponses.push(welcome);
    try { await sendBotMessage(chatId, welcome); } catch {}
    return;
  }

  await updateTriageSessionLanguage(sessionId, lang);
  await updateTriageSessionStatus(sessionId, "awaiting_name");

  const askName = getAskNameMessage(lang);
  botResponses.push(askName);
  try { await sendBotMessage(chatId, askName); } catch {}
}

async function handleNameStep(
  sessionId: string,
  chatId: string,
  contactId: string,
  lang: TriageLanguage,
  messageContent: string | null,
  botResponses: BotMessage[],
): Promise<void> {
  const name = messageContent?.trim();
  if (!name) return;

  await updateContactName(contactId, name);
  await updateTriageSessionStatus(sessionId, "awaiting_response");

  const menu = getServiceMenuMessage(name, lang);
  botResponses.push(menu);
  try { await sendBotMessage(chatId, menu); } catch {}
}

async function handleServiceStep(
  sessionId: string,
  chatId: string,
  lang: TriageLanguage,
  messageContent: string | null,
  botResponses: BotMessage[],
): Promise<void> {
  if (!messageContent) return;

  const leadType = parseTriageResponse(messageContent);

  if (!leadType) {
    const retry = getRetryServiceMessage(lang);
    botResponses.push(retry);
    try { await sendBotMessage(chatId, retry); } catch {}
    return;
  }

  await updateTriageSessionService(sessionId, leadType);
  await updateTriageSessionStatus(sessionId, "collecting_details");
  await updateTriageSessionStep(sessionId, 0, {});

  const flow = getServiceFlow(leadType);
  const firstStep = flow.steps[0];
  const msg = firstStep.getMessage(lang, {});
  botResponses.push(msg);
  try { await sendBotMessage(chatId, msg); } catch {}
}

async function handleDetailsStep(
  sessionId: string,
  chatId: string,
  contactId: string,
  lang: TriageLanguage,
  selectedService: LeadType,
  currentStep: number,
  collectedData: CollectedData,
  messageContent: string | null,
  botResponses: BotMessage[],
): Promise<void> {
  if (!messageContent) return;

  const flow = getServiceFlow(selectedService);
  const step = flow.steps[currentStep];
  if (!step) return;

  let answer: string;

  if (step.fieldType === "date") {
    const dateResult = parseDateInput(messageContent, lang);

    if (!dateResult) {
      const retry = getRetryDateMessage(lang);
      botResponses.push(retry);
      try { await sendBotMessage(chatId, retry); } catch {}
      return;
    }

    if (dateResult.type === "ambiguous") {
      const disambig = getDateDisambiguationMessage(lang, dateResult.optionA, dateResult.optionB);
      botResponses.push(disambig);
      try { await sendBotMessage(chatId, disambig); } catch {}
      return;
    }

    const conflicts = await checkCalendarConflicts(dateResult.date);
    if (conflicts.bookings.length > 0 || conflicts.blockedPeriods.length > 0) {
      const dateStr = lang === "en"
        ? formatDateEnglish(dateResult.date)
        : formatDateHebrew(dateResult.date);
      const unavailMsg: BotMessage = lang === "en"
        ? { text: `Unfortunately, Mia is not available on ${dateStr} 😔\nCould you suggest a different date?` }
        : { text: `לצערנו, מיה לא פנויה בתאריך ${dateStr} 😔\nאפשר לנסות תאריך אחר?` };
      botResponses.push(unavailMsg);
      try { await sendBotMessage(chatId, unavailMsg); } catch {}
      return;
    }

    answer = dateResult.date;
  } else {
    const stepMessage = step.getMessage(lang, collectedData);
    answer = matchButtonAnswer(stepMessage, messageContent);
  }

  const updatedData = { ...collectedData, [step.field]: answer };
  const nextStep = currentStep + 1;

  if (nextStep < flow.steps.length) {
    await updateTriageSessionStep(sessionId, nextStep, updatedData);

    const nextMsg = flow.steps[nextStep].getMessage(lang, updatedData);
    botResponses.push(nextMsg);
    try { await sendBotMessage(chatId, nextMsg); } catch {}
  } else {
    await finalizeTriage(sessionId, chatId, contactId, lang, selectedService, updatedData, botResponses);

    const closing = flow.getClosingMessage(lang);
    botResponses.push(closing);
    try { await sendBotMessage(chatId, closing); } catch {}
  }
}

async function finalizeTriage(
  sessionId: string,
  chatId: string,
  contactId: string,
  lang: TriageLanguage,
  selectedService: LeadType,
  collectedData: CollectedData,
  botResponses: BotMessage[],
): Promise<void> {
  try {
    await updateTriageSessionStep(sessionId, -1, collectedData);
    await completeTriageSession(sessionId, selectedService);

    const phone = chatIdToPhone(chatId);
    const contact = await upsertContactByWhatsApp({ chat_id: chatId, phone });

    const sourcePlatform = mapSourcePlatform(collectedData.source);

    const lead = await createLead({
      contact_id: contact.id,
      lead_type: selectedService,
      source_platform: sourcePlatform,
      metadata: { ...collectedData },
    });

    await logActivity("lead", lead.id, "created_via_triage", "bot", {
      chat_id: chatId,
      selected_type: selectedService,
      collected_data: collectedData,
    });
  } catch (error) {
    console.error("[triage] Failed to finalize:", error);
  }
}

function mapSourcePlatform(source: string | undefined): SourcePlatform {
  if (!source) return "whatsapp";
  const parsed = parseSourceFromAnswer(source);
  const valid: SourcePlatform[] = ["instagram", "facebook", "tiktok", "youtube", "website", "referral", "other"];
  return valid.includes(parsed as SourcePlatform) ? (parsed as SourcePlatform) : "other";
}
