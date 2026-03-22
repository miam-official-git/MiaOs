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
  | 'tiktok'
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

export type FollowUpType =
  | 'quote_reminder'
  | 'payment_reminder'
  | 'warm_intro'
  | 'general';

export type ActorType = 'system' | 'omer' | 'mia' | 'bot';

export type UserRole = 'admin' | 'talent' | 'bot';

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

// ---- Insert types (omit auto-generated fields) ----

export type ContactInsert = Omit<Contact, 'id' | 'created_at' | 'updated_at'>;
export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type BookingInsert = Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type BookingComponentInsert = Omit<BookingComponent, 'id' | 'created_at'>;
export type LessonInsert = Omit<Lesson, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>;
export type FinanceTransactionInsert = Omit<FinanceTransaction, 'id' | 'created_at' | 'updated_at'>;
export type FollowUpInsert = Omit<FollowUp, 'id' | 'created_at'>;
export type ActivityLogInsert = Omit<ActivityLog, 'id' | 'created_at'>;
