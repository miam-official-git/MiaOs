import type { BotMessage } from "./greenapi-client";
import type { LeadType, TriageLanguage } from "@/types/database";

export type CollectedData = Record<string, string>;

export interface FlowStep {
  field: string;
  fieldType?: "date";
  getMessage: (lang: TriageLanguage, data: CollectedData) => BotMessage;
}

export interface ServiceFlow {
  steps: FlowStep[];
  getClosingMessage: (lang: TriageLanguage) => BotMessage;
}

// ---- Source step (shared by all flows as last step) ----

const SOURCE_STEP: FlowStep = {
  field: "source",
  getMessage: (lang) =>
    lang === "en"
      ? {
          text: "One last question — how did you find us?",
          buttons: [
            { id: "src_instagram", label: "Instagram" },
            { id: "src_facebook", label: "Facebook" },
            { id: "src_tiktok", label: "TikTok" },
            { id: "src_youtube", label: "YouTube" },
            { id: "src_referral", label: "Recommendations" },
            { id: "src_other", label: "Other" },
          ],
        }
      : {
          text: "שאלה אחרונה — נשמח לדעת מהיכן הגעתם אלינו",
          buttons: [
            { id: "src_instagram", label: "אינסטגרם" },
            { id: "src_facebook", label: "פייסבוק" },
            { id: "src_tiktok", label: "טיקטוק" },
            { id: "src_youtube", label: "יוטיוב" },
            { id: "src_referral", label: "המלצות" },
            { id: "src_other", label: "אחר" },
          ],
        },
};

// ---- Per-service flows ----

const chuppahFlow: ServiceFlow = {
  steps: [
    {
      field: "wedding_date",
      fieldType: "date",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Mazal tov! 🥂 To check availability — what's the wedding date?" }
          : { text: "שיהיה המון מזל טוב! 🥂\nכדי שנבדוק יומנים — באיזה תאריך החתונה?" },
    },
    {
      field: "venue",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Great! And what's the venue name?" }
          : { text: "מעולה! ומה שם האולם בו אתם צפויים להתחתן?" },
    },
    {
      field: "partner_name",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "And what's the full name of your partner?" }
          : { text: "ומה השם המלא של בן או בת הזוג?" },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you for all the details! ✅\nWe'll get back to you as soon as possible.\nFeel free to tell us about yourselves and the ceremony you've dreamed of 💛" }
      : { text: "תודה על כל הפרטים! ✅\nנחזור אליך בהקדם האפשרי.\nמוזמנים בינתיים לספר לנו עליכם ועל החופה שחלמתם 💛" },
};

const vocalLessonFlow: ServiceFlow = {
  steps: [
    {
      field: "lesson_format",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "Great that you reached out! 🎤\nWould you prefer in-person or Zoom lessons?",
              buttons: [
                { id: "fmt_zoom", label: "Zoom" },
                { id: "fmt_inperson", label: "In-person" },
                { id: "fmt_hybrid", label: "Hybrid" },
              ],
            }
          : {
              text: "איזה כיף שפנית אלינו! 🎤\nהאם את מעוניינת בשיעור פרונטלי או בזום?",
              buttons: [
                { id: "fmt_zoom", label: "זום" },
                { id: "fmt_inperson", label: "פרונטלי" },
                { id: "fmt_hybrid", label: "משולב" },
              ],
            },
    },
    {
      field: "age",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "How old are you?" }
          : { text: "בת כמה את?" },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you for all the details! ✅\nWe'll get back to you soon.\nFeel free to share a bit about yourself and what made you want to learn vocal coaching 💛" }
      : { text: "תודה על כל הפרטים! ✅\nנחזור אליך בהקדם האפשרי.\nמוזמנת בינתיים לספר לנו קצת רקע על עצמך ומה גרם לך דווקא עכשיו לרצות ללמוד פיתוח קול 💛" },
};

const privateEventFlow: ServiceFlow = {
  steps: [
    {
      field: "event_type",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "How exciting! 🎉 What kind of event are you celebrating?",
              buttons: [
                { id: "evt_barmitzvah", label: "Bar/Bat Mitzvah" },
                { id: "evt_birthday", label: "Birthday" },
                { id: "evt_corporate", label: "Corporate Event" },
                { id: "evt_challah", label: "Hafrashat Challah" },
                { id: "evt_other", label: "Other" },
              ],
            }
          : {
              text: "איזה כיף שפניתכם אלינו! 🎉\nאיזה אירוע אתם חוגגים?",
              buttons: [
                { id: "evt_barmitzvah", label: "בר/בת מצווה" },
                { id: "evt_birthday", label: "יום הולדת" },
                { id: "evt_corporate", label: "אירוע חברה / הייטק" },
                { id: "evt_challah", label: "הפרשת חלה" },
                { id: "evt_other", label: "אחר" },
              ],
            },
    },
    {
      field: "event_date",
      fieldType: "date",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Thanks! What date is the event planned for?" }
          : { text: "תודה! באיזה תאריך האירוע מתוכנן?" },
    },
    {
      field: "event_location",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "And where will it take place?" }
          : { text: "ואיפה הוא יתקיים?" },
    },
    {
      field: "guest_count",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "What's the estimated number of guests?",
              buttons: [
                { id: "guests_small", label: "Up to 50" },
                { id: "guests_medium", label: "50–300" },
                { id: "guests_large", label: "300–600" },
                { id: "guests_xl", label: "600+" },
              ],
            }
          : {
              text: "מה כמות האורחים המשוערת?",
              buttons: [
                { id: "guests_small", label: "עד 50 איש" },
                { id: "guests_medium", label: "50 - 300 איש" },
                { id: "guests_large", label: "300 - 600 איש" },
                { id: "guests_xl", label: "יותר מ-600 איש" },
              ],
            },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you for all the details! ✅\nWe'll get back to you soon.\nFeel free to share more about the event ❤️" }
      : { text: "תודה על כל הפרטים! ✅\nנחזור אליך בהקדם האפשרי.\nעד אז מוזמנים לכתוב לנו קצת פרטים על האירוע ❤️" },
};

const internationalEventFlow: ServiceFlow = {
  steps: [
    {
      field: "event_location",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "How exciting! 🌍 Where in the world is the event planned?" }
          : { text: "איזה כיף שפניתכם אלינו! 🌍\nאיפה בעולם האירוע מתוכנן להתקיים?" },
    },
    {
      field: "event_date",
      fieldType: "date",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "And on what date?" }
          : { text: "ובאיזה תאריך?" },
    },
    {
      field: "event_type",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "What type of event is it?",
              buttons: [
                { id: "intl_wedding", label: "Wedding" },
                { id: "intl_barmitzvah", label: "Bar/Bat Mitzvah" },
                { id: "intl_community", label: "Community Event" },
                { id: "intl_concert", label: "Concert" },
                { id: "intl_birthday", label: "Birthday" },
                { id: "intl_party", label: "Party" },
                { id: "intl_other", label: "Other" },
              ],
            }
          : {
              text: "באיזה אירוע מדובר?",
              buttons: [
                { id: "intl_wedding", label: "חתונה" },
                { id: "intl_barmitzvah", label: "בר/בת מצווה" },
                { id: "intl_community", label: "אירוע קהילתי" },
                { id: "intl_concert", label: "הופעה" },
                { id: "intl_birthday", label: "יום הולדת" },
                { id: "intl_party", label: "מסיבה" },
                { id: "intl_other", label: "אחר" },
              ],
            },
    },
    {
      field: "guest_count",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "What's the estimated number of guests?",
              buttons: [
                { id: "guests_small", label: "Up to 50" },
                { id: "guests_medium", label: "50–300" },
                { id: "guests_large", label: "300–600" },
                { id: "guests_xl", label: "600+" },
              ],
            }
          : {
              text: "מה כמות האורחים המשוערת?",
              buttons: [
                { id: "guests_small", label: "עד 50 איש" },
                { id: "guests_medium", label: "50 - 300 איש" },
                { id: "guests_large", label: "300 - 600 איש" },
                { id: "guests_xl", label: "יותר מ-600 איש" },
              ],
            },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you for all the details! ✅\nWe'll get back to you soon.\nFeel free to share more about the event ❤️" }
      : { text: "תודה על כל הפרטים! ✅\nנחזור אליך בהקדם האפשרי.\nעד אז מוזמנים לכתוב לנו קצת פרטים על האירוע ❤️" },
};

const modelingFlow: ServiceFlow = {
  steps: [
    {
      field: "brand_info",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Wonderful! 📸 What brand or type of production is this for?\n(We'd love a link to your Instagram or website too)" }
          : { text: "איזה יופי! 📸\nעבור איזה מותג או סוג הפקה מדובר?\n(נשמח מאוד גם לקישור לאינסטגרם או לאתר שלכם)" },
    },
    {
      field: "shoot_date",
      fieldType: "date",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Great. When are the shoots planned?" }
          : { text: "מעולה. באיזה תאריך מתוכננים הצילומים?" },
    },
    {
      field: "shoot_location",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "And where will they take place?" }
          : { text: "ואיפה הם צפויים להתקיים?" },
    },
    {
      field: "shoot_duration",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "What's the planned duration of the shoot?",
              buttons: [
                { id: "dur_half", label: "Half day (up to 4h)" },
                { id: "dur_full", label: "Full day (up to 8h)" },
                { id: "dur_hours", label: "A few hours / TBD" },
                { id: "dur_multi", label: "Multiple days" },
              ],
            }
          : {
              text: "ומה אורך יום הצילומים המתוכנן?",
              buttons: [
                { id: "dur_half", label: "חצי יום (עד 4 שעות)" },
                { id: "dur_full", label: "יום מלא (עד 8 שעות)" },
                { id: "dur_hours", label: "שעות בודדות / טרם נקבע" },
                { id: "dur_multi", label: "כמה ימים שונים" },
              ],
            },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you for all the details! ✅\nWe'll pass everything to Mia and get back to you soon.\nFeel free to share more details or links 💛" }
      : { text: "תודה על כל הפרטים! ✅\nנמסור הכל למיה, נבחן את הדברים ונחזור אליך בהקדם האפשרי.\nבינתיים מוזמנים לשתף כאן עוד פרטים או קישורים 💛" },
};

const musicalProductionFlow: ServiceFlow = {
  steps: [
    {
      field: "project_type",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "Exciting! 🎵 What kind of musical project are you interested in?",
              buttons: [
                { id: "mus_original", label: "Original song" },
                { id: "mus_chuppah_rec", label: "Chuppah song recording" },
                { id: "mus_memorial", label: "Memorial song" },
                { id: "mus_personal", label: "Personal recording" },
                { id: "mus_consulting", label: "Production consulting" },
                { id: "mus_other", label: "Other" },
              ],
            }
          : {
              text: "איזה כיף! 🎵\nשתפו אותי באיזה פרויקט מוזיקלי אתם מעוניינים?",
              buttons: [
                { id: "mus_original", label: "שיר מקורי (כתיבה והלחנה)" },
                { id: "mus_chuppah_rec", label: "שיר חופה בהקלטה" },
                { id: "mus_memorial", label: "שיר לזכרו של אדם" },
                { id: "mus_personal", label: "הקלטה אישית לשיר" },
                { id: "mus_consulting", label: "ייעוץ בהפקה" },
                { id: "mus_other", label: "אחר" },
              ],
            },
    },
    {
      field: "deadline",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Great. When does the song or project need to be ready?" }
          : { text: "מעולה. מתי השיר או הפרויקט צריך להיות מוכן?" },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you for all the details! ✅\nWe'll get back to you soon.\nFeel free to share more about the project and what you'd like us to do together 😊" }
      : { text: "תודה על כל הפרטים! ✅\nנחזור אליך בהקדם האפשרי.\nעד אז מוזמנים לכתוב לנו על סוג הפרויקט ומה אתם בדיוק תרצו שנעשה יחד 😊" },
};

const collaborationFlow: ServiceFlow = {
  steps: [
    {
      field: "collab_details",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "We'd love to hear! 🤝\nTell us briefly who you are and what kind of collaboration you have in mind?" }
          : { text: "נשמח מאוד לשמוע! 🤝\nספרו לנו בקצרה מי אתם ואיזה שיתוף פעולה מעניין יש לכם בראש?" },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you! ✅\nWe'll pass everything to Mia and get back to you soon.\nFeel free to share more details or links 💛" }
      : { text: "תודה על כל הפרטים! ✅\nנמסור הכל למיה, נבחן את הדברים ונחזור אליך בהקדם האפשרי.\nבינתיים מוזמנים להמשיך לשתף כאן עוד פרטים או קישורים אם יש 💛" },
};

const consultationFlow: ServiceFlow = {
  steps: [
    {
      field: "focus_area",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "Great! 💡 What would you like to focus on in the consultation?",
              buttons: [
                { id: "cons_content", label: "Social media content" },
                { id: "cons_vocal", label: "Vocal & performance" },
                { id: "cons_video", label: "Video & editing" },
                { id: "cons_other", label: "Other" },
              ],
            }
          : {
              text: "איזה כיף! 💡\nבמה היית שמחה שנתמקד בפגישת ייעוץ?",
              buttons: [
                { id: "cons_content", label: "תוכן ברשתות חברתיות" },
                { id: "cons_vocal", label: "פיתוח קול וביצוע" },
                { id: "cons_video", label: "צילום ועריכת וידאו" },
                { id: "cons_other", label: "אחר" },
              ],
            },
    },
    {
      field: "meeting_type",
      getMessage: (lang) =>
        lang === "en"
          ? {
              text: "What type of meeting do you think would work best?",
              buttons: [
                { id: "meet_single", label: "One-time (focused)" },
                { id: "meet_ongoing", label: "Ongoing process" },
                { id: "meet_unsure", label: "Not sure yet" },
              ],
            }
          : {
              text: "איזה סוג פגישה את חושבת שתתאים בעבורך?",
              buttons: [
                { id: "meet_single", label: "פגישה חד-פעמית (ממוקדת)" },
                { id: "meet_ongoing", label: "תהליך ליווי (כמה פגישות)" },
                { id: "meet_unsure", label: "עדיין לא יודע/ת, בואי נבדוק יחד" },
              ],
            },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you! ✅\nI'll get back to you soon with all the details.\nFeel free to share a bit about yourself and what you're looking for ❤️" }
      : { text: "תודה שרשמת לי! ✅\nאחזור אלייך בהקדם עם כל הפרטים.\nמוזמנת בינתיים לשתף קצת על עצמך ומה את מחפשת בתהליך ❤️" },
};

const marriageProposalFlow: ServiceFlow = {
  steps: [
    {
      field: "proposal_date",
      fieldType: "date",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "Wow, congratulations! 🥹💍\nWhen is the proposal planned?" }
          : { text: "וואו מזל טוב איזה מרגשש 🥹💍\nמתי ההצעה מתוכננת?" },
    },
    {
      field: "proposal_location",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "And where will it take place?" }
          : { text: "ובאיזה מיקום?" },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you! ✅\nI'll get back to you soon with all the details.\nFeel free to share more about the proposal and what you had in mind 💛" }
      : { text: "תודה שרשמת לי! ✅\nאחזור אליך בהקדם עם כל הפרטים.\nמוזמן בינתיים לשתף קצת פרטים על ההצעה ומה בדיוק חשבת לעשות 💛" },
};

const otherFlow: ServiceFlow = {
  steps: [
    {
      field: "service_details",
      getMessage: (lang) =>
        lang === "en"
          ? { text: "We'd love to hear what service you're looking for! 😊" }
          : { text: "אשמח לשמוע מה סוג השירות אותו אתם מחפשים? 😊" },
    },
    SOURCE_STEP,
  ],
  getClosingMessage: (lang) =>
    lang === "en"
      ? { text: "Thank you! ✅\nWe'll get back to you soon.\nFeel free to share more details about what you're interested in ❤️" }
      : { text: "תודה שכתבתם לי! ✅\nאחזור אליכם בהקדם עם כל הפרטים.\nמוזמנים בינתיים לרשום לי במה אתם מתעניינים ואיך אוכל לעזור ❤️" },
};

// ---- Flow registry ----

const FLOWS: Record<LeadType, ServiceFlow> = {
  chuppah: chuppahFlow,
  vocal_lesson: vocalLessonFlow,
  private_event: privateEventFlow,
  international_event: internationalEventFlow,
  modeling: modelingFlow,
  musical_production: musicalProductionFlow,
  collaboration: collaborationFlow,
  consultation: consultationFlow,
  marriage_proposal: marriageProposalFlow,
  other: otherFlow,
};

export function getServiceFlow(leadType: LeadType): ServiceFlow {
  return FLOWS[leadType] ?? FLOWS.other;
}

// ---- Source parsing helper ----

export function parseSourceFromAnswer(text: string): string {
  const t = text.trim().toLowerCase();
  if (t === "src_instagram" || t === "1" || /אינסטגרם|instagram/i.test(t)) return "instagram";
  if (t === "src_facebook" || t === "2" || /פייסבוק|facebook/i.test(t)) return "facebook";
  if (t === "src_tiktok" || t === "3" || /טיקטוק|tiktok/i.test(t)) return "tiktok";
  if (t === "src_youtube" || t === "4" || /יוטיוב|youtube/i.test(t)) return "youtube";
  if (t === "src_referral" || t === "5" || /המלצות|recommend/i.test(t)) return "referral";
  if (t === "src_other" || t === "6" || /אחר|other/i.test(t)) return "other";
  return text.trim();
}

// ---- Button matching helper ----

export function matchButtonAnswer(msg: BotMessage, userText: string): string {
  if (!msg.buttons?.length) return userText.trim();

  const t = userText.trim();

  for (const btn of msg.buttons) {
    if (t === btn.id || t.toLowerCase() === btn.label.toLowerCase()) return btn.label;
  }

  const num = parseInt(t);
  if (num >= 1 && num <= msg.buttons.length) return msg.buttons[num - 1].label;

  return t;
}
