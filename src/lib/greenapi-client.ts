import type { GreenApiSendResponse } from "@/types/greenapi";
import type { LeadType, TriageLanguage } from "@/types/database";

const instanceId = process.env.GREENAPI_INSTANCE_ID;
const apiToken = process.env.GREENAPI_API_TOKEN;

function isConfigured(): boolean {
  return !!instanceId && !!apiToken;
}

function apiUrl(method: string): string {
  return `https://api.green-api.com/waInstance${instanceId}/${method}/${apiToken}`;
}

// ---- Structured bot message ----

export interface BotButton {
  id: string;
  label: string;
}

export interface BotMessage {
  text: string;
  buttons?: BotButton[];
  listButtonText?: string;
}

// ---- Send helpers ----

export async function sendTextMessage(
  chatId: string,
  text: string,
): Promise<GreenApiSendResponse> {
  if (!isConfigured()) {
    console.log("[greenapi] Not configured — skipping send:", text.slice(0, 60));
    return { idMessage: `local-${Date.now()}` };
  }

  const res = await fetch(apiUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Green API sendMessage failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GreenApiSendResponse>;
}

export async function sendBotMessage(
  chatId: string,
  msg: BotMessage,
): Promise<GreenApiSendResponse> {
  if (!isConfigured()) {
    console.log("[greenapi] Not configured — skipping send:", msg.text.slice(0, 60));
    return { idMessage: `local-${Date.now()}` };
  }

  const count = msg.buttons?.length ?? 0;

  if (count === 0) {
    return sendTextMessage(chatId, msg.text);
  }

  if (count >= 4 && count <= 10) {
    try {
      return await sendListMessageApi(chatId, msg);
    } catch (err) {
      console.warn("[greenapi] sendListMessage failed, falling back to poll:", err);
    }
  }

  try {
    return await sendPollMessage(chatId, msg);
  } catch (err) {
    console.warn("[greenapi] sendPoll failed, falling back to text:", err);
  }

  return sendTextMessage(chatId, botMessageToText(msg));
}

async function sendPollMessage(
  chatId: string,
  msg: BotMessage,
): Promise<GreenApiSendResponse> {
  const res = await fetch(apiUrl("sendPoll"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      message: msg.text,
      options: msg.buttons!.map((b) => ({ optionName: b.label })),
      multipleAnswers: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Green API sendPoll failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GreenApiSendResponse>;
}

async function sendListMessageApi(
  chatId: string,
  msg: BotMessage,
): Promise<GreenApiSendResponse> {
  const res = await fetch(apiUrl("sendListMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chatId,
      message: msg.text,
      title: "",
      footer: "",
      buttonText: msg.listButtonText ?? "בחר/י",
      sections: [
        {
          title: " ",
          rows: msg.buttons!.map((b) => ({
            title: b.label,
            rowId: b.id,
          })),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Green API sendListMessage failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<GreenApiSendResponse>;
}

export function botMessageToText(msg: BotMessage): string {
  if (!msg.buttons?.length) return msg.text;
  const opts = msg.buttons.map((b, i) => `${i + 1} - ${b.label}`).join("\n");
  return `${msg.text}\n\n${opts}`;
}

// ---- Triage message builders ----

export function getWelcomeMessage(): BotMessage {
  return {
    text: [
      "היי! 👋 הגעת למיה משרקי.",
      "תודה רבה שפנית אלינו!",
      "",
      "Hi! 👋 You've reached Mia Mesharki.",
      "Thanks for reaching out!",
      "",
      "אנא בחר/י שפה · Please choose a language:",
    ].join("\n"),
    buttons: [
      { id: "lang_he", label: "עברית" },
      { id: "lang_en", label: "English" },
    ],
  };
}

export function getAskNameMessage(lang: TriageLanguage): BotMessage {
  if (lang === "en") {
    return {
      text: [
        "Great! 🙏",
        "To give you the best and fastest service,",
        "we'd love to get a few quick details.",
        "",
        "First — what's your name? 😊",
      ].join("\n"),
    };
  }
  return {
    text: [
      "מעולה! 🙏",
      "כדי שנוכל לתת לך את המענה הכי מהיר והכי מדויק,",
      "נשמח לקבל ממך כמה פרטים קצרים.",
      "",
      "קודם כל — מה השם שלך? 😊",
    ].join("\n"),
  };
}

export function getServiceMenuMessage(name: string, lang: TriageLanguage): BotMessage {
  if (lang === "en") {
    return {
      text: `Thanks ${name}! 🤩\nWhich service are you interested in?`,
      listButtonText: "Choose a service",
      buttons: [
        { id: "svc_vocal", label: "Vocal Coaching 🎤" },
        { id: "svc_chuppah", label: "Wedding Ceremony 💒" },
        { id: "svc_event", label: "Private Event 🎉" },
        { id: "svc_intl_event", label: "International Event 🌍" },
        { id: "svc_modeling", label: "Modeling 📸" },
        { id: "svc_music", label: "Musical Production 🎵" },
        { id: "svc_collab", label: "Collaboration 🤝" },
        { id: "svc_consult", label: "Consultation 💡" },
        { id: "svc_proposal", label: "Marriage Proposal 💍" },
        { id: "svc_other", label: "Other" },
      ],
    };
  }
  return {
    text: `תודה ${name}! 🤩\nאיזה שירות מעניין אותך?`,
    listButtonText: "בחר/י שירות",
    buttons: [
      { id: "svc_vocal", label: "פיתוח קול 🎤" },
      { id: "svc_chuppah", label: "חופה 💒" },
      { id: "svc_event", label: "אירוע פרטי 🎉" },
      { id: "svc_intl_event", label: "אירוע בחו״ל 🌍" },
      { id: "svc_modeling", label: "דוגמנות 📸" },
      { id: "svc_music", label: "הפקה מוזיקלית 🎵" },
      { id: "svc_collab", label: "שיתוף פעולה 🤝" },
      { id: "svc_consult", label: "פגישת ייעוץ 💡" },
      { id: "svc_proposal", label: "הצעת נישואין 💍" },
      { id: "svc_other", label: "אחר" },
    ],
  };
}

export function getAskDateMessage(lang: TriageLanguage): BotMessage {
  if (lang === "en") {
    return {
      text: [
        "Great choice! 📅",
        "What date works for you?",
        "",
        "You can write it in any format, for example:",
        "15/6, June 15, next Friday",
      ].join("\n"),
    };
  }
  return {
    text: [
      "בחירה מעולה! 📅",
      "מה התאריך המבוקש?",
      "",
      "אפשר לכתוב בכל פורמט, למשל:",
      "15/6, 15 ביוני, יום שישי הקרוב",
    ].join("\n"),
  };
}

export function getRetryDateMessage(lang: TriageLanguage): BotMessage {
  if (lang === "en") {
    return {
      text: [
        "I couldn't understand the date 🤔",
        "Please try again, for example: 15/6 or June 15",
      ].join("\n"),
    };
  }
  return {
    text: [
      "לא הצלחתי להבין את התאריך 🤔",
      "אפשר לנסות שוב? למשל: 15/6 או 15 ביוני",
    ].join("\n"),
  };
}

export function getConfirmationMessage(lang: TriageLanguage, date?: string): BotMessage {
  const datePart = date
    ? lang === "en"
      ? `\nRequested date: ${formatDateEnglish(date)}`
      : `\nתאריך מבוקש: ${formatDateHebrew(date)}`
    : "";

  if (lang === "en") {
    return {
      text: `Thank you! ✅\nYour inquiry has been received.${datePart}\nWe'll be in touch soon 💛`,
    };
  }
  return {
    text: `תודה! ✅\nהפניה שלך התקבלה.${datePart}\nניצור איתך קשר בהקדם 💛`,
  };
}

export function getRetryServiceMessage(lang: TriageLanguage): BotMessage {
  if (lang === "en") {
    return { text: "I didn't catch that 🤔\nPlease choose one of the options above." };
  }
  return { text: "לא הצלחתי להבין 🤔\nאנא בחר/י מאחת האפשרויות למעלה." };
}

// ---- Parsers ----

export function parseLanguageSelection(text: string): TriageLanguage | null {
  const t = text.trim().toLowerCase();
  if (t === "עברית" || t === "lang_he" || t === "1" || /^עבר/.test(t)) return "he";
  if (t === "english" || t === "lang_en" || t === "2" || /^eng/.test(t)) return "en";
  return null;
}

export function parseTriageResponse(text: string): LeadType | null {
  const trimmed = text.trim().toLowerCase();

  if (trimmed === "1" || trimmed === "svc_vocal" || /קול|פיתוח|vocal/i.test(trimmed))
    return "vocal_lesson";
  if (trimmed === "2" || trimmed === "svc_chuppah" || /חופה|wedding cerem/i.test(trimmed))
    return "chuppah";
  if (trimmed === "3" || trimmed === "svc_event" || /אירוע פרטי|private event/i.test(trimmed))
    return "private_event";
  if (trimmed === "4" || trimmed === "svc_intl_event" || /חו.ל|international/i.test(trimmed))
    return "international_event";
  if (trimmed === "5" || trimmed === "svc_modeling" || /דוגמנות|מודל|modeling/i.test(trimmed))
    return "modeling";
  if (trimmed === "6" || trimmed === "svc_music" || /הפקה מוזיקלית|musical prod/i.test(trimmed))
    return "musical_production";
  if (trimmed === "7" || trimmed === "svc_collab" || /שיתוף פעולה|collaborat/i.test(trimmed))
    return "collaboration";
  if (trimmed === "8" || trimmed === "svc_consult" || /ייעוץ|פגישת|consult/i.test(trimmed))
    return "consultation";
  if (trimmed === "9" || trimmed === "svc_proposal" || /נישואין|הצעת|proposal/i.test(trimmed))
    return "marriage_proposal";
  if (trimmed === "10" || trimmed === "svc_other" || /אחר|other/i.test(trimmed))
    return "other";

  return null;
}

// ---- Date parsing ----

const HE_MONTHS: Record<string, number> = {
  "ינואר": 1, "פברואר": 2, "מרץ": 3, "אפריל": 4,
  "מאי": 5, "יוני": 6, "יולי": 7, "אוגוסט": 8,
  "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12,
};

const EN_MONTHS: Record<string, number> = {
  "january": 1, "february": 2, "march": 3, "april": 4,
  "may": 5, "june": 6, "july": 7, "august": 8,
  "september": 9, "october": 10, "november": 11, "december": 12,
  "jan": 1, "feb": 2, "mar": 3, "apr": 4,
  "jun": 6, "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
};

const HE_DAYS: Record<string, number> = {
  "ראשון": 0, "שני": 1, "שלישי": 2, "רביעי": 3,
  "חמישי": 4, "שישי": 5, "שבת": 6,
};

const EN_DAYS: Record<string, number> = {
  "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3,
  "thursday": 4, "friday": 5, "saturday": 6,
  "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6,
};

function nextWeekday(dayOfWeek: number): Date {
  const now = new Date();
  const current = now.getDay();
  let diff = dayOfWeek - current;
  if (diff <= 0) diff += 7;
  const result = new Date(now);
  result.setDate(result.getDate() + diff);
  return result;
}

function toISODate(day: number, month: number, year?: number): string | null {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const finalYear = (!year && (month < now.getMonth() + 1 || (month === now.getMonth() + 1 && day < now.getDate())))
    ? y + 1
    : y;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const d = new Date(finalYear, month - 1, day);
  if (d.getDate() !== day || d.getMonth() !== month - 1) return null;
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export type DateParseResult =
  | { type: "resolved"; date: string }
  | { type: "ambiguous"; optionA: { date: string; label: string }; optionB: { date: string; label: string } }
  | null;

export function parseDateInput(text: string, lang: TriageLanguage): DateParseResult {
  const t = text.trim();

  // Direct date from disambiguation button (e.g. "date_2026-06-15")
  if (/^date_\d{4}-\d{2}-\d{2}$/.test(t)) {
    return { type: "resolved", date: t.slice(5) };
  }

  // Relative: today/tomorrow
  if (/^(היום|today)$/i.test(t)) {
    return { type: "resolved", date: new Date().toLocaleDateString("sv-SE") };
  }
  if (/^(מחר|tomorrow)$/i.test(t)) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return { type: "resolved", date: d.toLocaleDateString("sv-SE") };
  }
  if (/^(מחרתיים)$/i.test(t)) {
    const d = new Date(); d.setDate(d.getDate() + 2);
    return { type: "resolved", date: d.toLocaleDateString("sv-SE") };
  }

  // Hebrew day name
  for (const [name, dow] of Object.entries(HE_DAYS)) {
    if (t.includes(name)) {
      return { type: "resolved", date: nextWeekday(dow).toLocaleDateString("sv-SE") };
    }
  }

  // English day name
  for (const [name, dow] of Object.entries(EN_DAYS)) {
    if (t.toLowerCase().includes(name)) {
      return { type: "resolved", date: nextWeekday(dow).toLocaleDateString("sv-SE") };
    }
  }

  // Hebrew month: "15 ביוני"
  for (const [name, m] of Object.entries(HE_MONTHS)) {
    const re = new RegExp(`(\\d{1,2})\\s*(?:ב)?${name}`);
    const match = t.match(re);
    if (match) {
      const d = toISODate(parseInt(match[1]), m);
      return d ? { type: "resolved", date: d } : null;
    }
  }

  // English month: "June 15" / "15 June"
  for (const [name, m] of Object.entries(EN_MONTHS)) {
    const re1 = new RegExp(`${name}\\s+(\\d{1,2})`, "i");
    const re2 = new RegExp(`(\\d{1,2})\\s+${name}`, "i");
    const m1 = t.match(re1);
    if (m1) { const d = toISODate(parseInt(m1[1]), m); return d ? { type: "resolved", date: d } : null; }
    const m2 = t.match(re2);
    if (m2) { const d = toISODate(parseInt(m2[1]), m); return d ? { type: "resolved", date: d } : null; }
  }

  // Numeric: D/M or M/D
  const numMatch = t.match(/^(\d{1,2})[\/\.\-](\d{1,2})(?:[\/\.\-](\d{2,4}))?$/);
  if (numMatch) {
    const a = parseInt(numMatch[1]);
    const b = parseInt(numMatch[2]);
    let yr = numMatch[3] ? parseInt(numMatch[3]) : undefined;
    if (yr && yr < 100) yr += 2000;

    // Unambiguous: one number > 12, must be the day
    if (a > 12 && b <= 12) {
      const d = toISODate(a, b, yr);
      return d ? { type: "resolved", date: d } : null;
    }
    if (b > 12 && a <= 12) {
      const d = toISODate(b, a, yr);
      return d ? { type: "resolved", date: d } : null;
    }

    // Same number — doesn't matter
    if (a === b) {
      const d = toISODate(a, b, yr);
      return d ? { type: "resolved", date: d } : null;
    }

    // Both ≤ 12 and different — ambiguous!
    if (a <= 12 && b <= 12) {
      const dateAsDM = toISODate(a, b, yr); // a=day, b=month
      const dateAsMD = toISODate(b, a, yr); // a=month, b=day
      if (dateAsDM && dateAsMD) {
        const fmtDM = lang === "en" ? formatDateEnglish(dateAsDM) : formatDateHebrew(dateAsDM);
        const fmtMD = lang === "en" ? formatDateEnglish(dateAsMD) : formatDateHebrew(dateAsMD);
        return {
          type: "ambiguous",
          optionA: { date: dateAsDM, label: fmtDM },
          optionB: { date: dateAsMD, label: fmtMD },
        };
      }
      // If only one is valid, use that
      if (dateAsDM) return { type: "resolved", date: dateAsDM };
      if (dateAsMD) return { type: "resolved", date: dateAsMD };
    }
  }

  return null;
}

export function getDateDisambiguationMessage(
  lang: TriageLanguage,
  optionA: { date: string; label: string },
  optionB: { date: string; label: string },
): BotMessage {
  if (lang === "en") {
    return {
      text: "Just to make sure — which date did you mean? 🤔",
      buttons: [
        { id: `date_${optionA.date}`, label: optionA.label },
        { id: `date_${optionB.date}`, label: optionB.label },
      ],
    };
  }
  return {
    text: "רק כדי לוודא — לאיזה תאריך התכוונת? 🤔",
    buttons: [
      { id: `date_${optionA.date}`, label: optionA.label },
      { id: `date_${optionB.date}`, label: optionB.label },
    ],
  };
}

export function formatDateHebrew(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateEnglish(isoDate: string): string {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}
