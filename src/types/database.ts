// ============================================================
// Mia-OS: Database TypeScript Types
// Matches the Supabase schema defined in migrations
// ============================================================

// ---- Enums ----

export type LeadType =
  | 'vocal_lesson'
  | 'chuppah'
  | 'private_event'
  | 'modeling'
  | 'musical_production'
  | 'collaboration'
  | 'international_event'
  | 'consultation'
  | 'marriage_proposal'
  | 'other';

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'quoted'
  | 'negotiating'
  | 'rejected'
  | 'converted'
  | 'lost'
  | 'archived';

export type SourcePlatform =
  | 'whatsapp'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'website'
  | 'referral'
  | 'other';

export type BookingStatus =
  | 'new'
  | 'option'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export type ComponentType =
  | 'talent_fee'
  | 'pianist'
  | 'soundman'
  | 'travel'
  | 'flights'
  | 'accommodation'
  | 'other';

export type AttendanceStatus =
  | 'scheduled'
  | 'attended'
  | 'no_show'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'overdue';

export type PaymentMethod =
  | 'bit'
  | 'paybox'
  | 'cash'
  | 'check'
  | 'bank_transfer'
  | 'morning_api';

export type TransactionStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'refunded';

export type PaymentStage = 'deposit' | 'interim' | 'final' | 'full';

export type FollowUpType =
  | 'quote_reminder'
  | 'payment_reminder'
  | 'warm_intro'
  | 'general';

export type ActorType = 'system' | 'omer' | 'mia' | 'bot';

export type UserRole = 'admin' | 'talent' | 'bot';

// ---- Green API / Messages enums ----

export type MessageDirection = 'inbound' | 'outbound';

export type MessageContentType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'voice'
  | 'document'
  | 'location'
  | 'contact'
  | 'sticker'
  | 'other';

export type TriageSessionStatus =
  | 'awaiting_language'
  | 'awaiting_name'
  | 'awaiting_response'
  | 'collecting_details'
  | 'awaiting_date'
  | 'completed'
  | 'paused'
  | 'expired';

export type TriageLanguage = 'he' | 'en';

// ---- Metadata shapes per lead type ----

export interface VocalLessonMetadata {
  gender?: string;
  age?: number;
  experience?: string;
  location_preference?: 'zoom' | 'in_person';
}

export interface ChuppahMetadata {
  venue?: string;
  preferred_song?: string;
  style?: string;
  date?: string;
}

export interface PrivateEventMetadata {
  event_type?: string;
  occasion?: string;
  requirements?: string;
}

export interface ModelingMetadata {
  project_type?: string;
  brand?: string;
  requirements?: string;
}

export type LeadMetadata =
  | VocalLessonMetadata
  | ChuppahMetadata
  | PrivateEventMetadata
  | ModelingMetadata
  | Record<string, unknown>;

// ---- Table row types ----

export interface Profile {
  id: string;
  role: UserRole;
  created_at: string;
}

export interface Contact {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  manychat_subscriber_id: string | null;
  whatsapp_chat_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  contact_id: string;
  lead_type: LeadType;
  status: LeadStatus;
  source_platform: SourcePlatform;
  manychat_subscriber_id: string | null;
  rejection_reason: string | null;
  metadata: LeadMetadata;
  notes: string | null;
  ai_summary: string | null;
  assigned_to: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  lead_id: string;
  booking_type: LeadType;
  status: BookingStatus;
  event_date: string;
  event_end_date: string | null;
  location_city: string | null;
  location_address: string | null;
  location_coords: { x: number; y: number } | null;
  total_price: number;
  notes: string | null;
  quote_sent_at: string | null;
  quote_signed_at: string | null;
  quote_url: string | null;
  event_start_time: string | null;
  event_end_time: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingComponent {
  id: string;
  booking_id: string;
  component_type: ComponentType;
  description: string | null;
  cost: number;
  is_revenue: boolean;
  created_at: string;
}

export interface Lesson {
  id: string;
  lead_id: string;
  lesson_number: number;
  total_lessons: number;
  scheduled_at: string;
  duration_minutes: number;
  attendance_status: AttendanceStatus;
  payment_status: PaymentStatus;
  payment_amount: number | null;
  mia_notes: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceTransaction {
  id: string;
  booking_id: string | null;
  lesson_id: string | null;
  amount: number;
  payment_method: PaymentMethod | null;
  status: TransactionStatus;
  payment_stage: PaymentStage;
  morning_receipt_id: string | null;
  due_date: string | null;
  paid_at: string | null;
  debtor_reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FollowUp {
  id: string;
  lead_id: string | null;
  booking_id: string | null;
  type: FollowUpType;
  scheduled_for: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: ActorType;
  details: Record<string, unknown>;
  created_at: string;
}

// ---- View types ----

export interface Debtor {
  contact_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source_type: 'booking' | 'lesson';
  source_id: string;
  transaction_id: string;
  amount: number;
  due_date: string | null;
  debtor_reminder_sent_at: string | null;
  payment_stage: PaymentStage;
  service_date: string;
}

export interface FollowUpCandidate {
  booking_id: string;
  lead_id: string;
  full_name: string;
  phone: string | null;
  booking_type: LeadType;
  quote_sent_at: string;
  total_price: number;
  time_since_quote: string;
}

export interface DashboardStats {
  new_leads: number;
  confirmed_this_month: number;
  upcoming_lessons: number;
  total_outstanding: number;
  overdue_followups: number;
}

// ---- Messages & Triage ----

export interface Message {
  id: string;
  contact_id: string | null;
  direction: MessageDirection;
  message_type: MessageContentType;
  content: string | null;
  sender_phone: string | null;
  sender_name: string | null;
  chat_id: string;
  greenapi_id_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TriageSession {
  id: string;
  contact_id: string | null;
  chat_id: string;
  status: TriageSessionStatus;
  language: TriageLanguage | null;
  selected_service: LeadType | null;
  requested_date: string | null;
  current_step: number;
  collected_data: Record<string, string>;
  triage_message_sent_at: string | null;
  response_received_at: string | null;
  selected_lead_type: LeadType | null;
  paused_until: string | null;
  created_at: string;
  updated_at: string;
}

export type CommunicationType = 'phone_call' | 'meeting' | 'email' | 'note';

export interface CommunicationLog {
  id: string;
  contact_id: string;
  comm_type: CommunicationType;
  direction: MessageDirection | null;
  summary: string;
  details: Record<string, unknown>;
  logged_by: ActorType;
  created_at: string;
}

export interface ContactNote {
  id: string;
  contact_id: string;
  content: string;
  author: ActorType;
  created_at: string;
}

// ---- Calendar: Blocked Periods & Reminders ----

export type ReminderType = 'day_before' | 'hour_before' | 'custom';

export interface BlockedPeriod {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  created_by: ActorType;
  created_at: string;
}

export interface Reminder {
  id: string;
  contact_id: string | null;
  booking_id: string | null;
  lesson_id: string | null;
  reminder_type: ReminderType;
  scheduled_for: string;
  sent_at: string | null;
  message_text: string | null;
  created_at: string;
}

// ---- Automation ----

export type AutomationTriggerType =
  | 'lead_stale'
  | 'quote_unsigned'
  | 'payment_overdue'
  | 'post_event'
  | 'triage_stale';

export type AutomationActionType = 'create_followup' | 'send_whatsapp' | 'both';

export interface AutomationRule {
  id: string;
  name: string;
  description: string | null;
  trigger_type: AutomationTriggerType;
  delay_hours: number;
  action_type: AutomationActionType;
  message_template: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Quotes ----

export interface QuoteItem {
  name: string;
  description?: string;
  amount: number;
  is_included: boolean;
}

export interface QuotePaymentTerms {
  deposit_percent: number;
  deposit_amount: number;
  deposit_due: string;
  final_amount: number;
  final_due: string;
  payment_methods: string[];
  notes?: string;
}

export interface Quote {
  id: string;
  booking_id: string;
  token: string;
  title: string;
  description: string | null;
  items: QuoteItem[];
  total_amount: number;
  payment_terms: QuotePaymentTerms;
  general_terms: string | null;
  valid_until: string | null;
  sent_at: string | null;
  sent_via: string | null;
  viewed_at: string | null;
  signer_name: string | null;
  signer_id_number: string | null;
  signature_data: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Insert types (omit auto-generated fields) ----

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type BookingComponentInsert = Omit<BookingComponent, 'id' | 'created_at'>;
export type LessonInsert = Omit<Lesson, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type FinanceTransactionInsert = Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>;
export type FollowUpInsert = Omit<FollowUp, 'id' | 'created_at'>;
export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>;
export type MessageInsert = Omit<Message, 'id' | 'created_at'>;
export type TriageSessionInsert = Omit<TriageSession, 'id' | 'created_at' | 'updated_at'>;
export type ContactNoteInsert = Omit<ContactNote, 'id' | 'created_at'>;
export type CommunicationLogInsert = Omit<CommunicationLog, 'id' | 'created_at'>;
export type BlockedPeriodInsert = Omit<BlockedPeriod, 'id' | 'created_at'>;
export type ReminderInsert = Omit<Reminder, 'id' | 'created_at'>;
export type QuoteInsert = Omit<Quote, 'id' | 'token' | 'created_at' | 'updated_at' | 'sent_at' | 'sent_via' | 'viewed_at' | 'signer_name' | 'signer_id_number' | 'signature_data' | 'signed_at'>;
