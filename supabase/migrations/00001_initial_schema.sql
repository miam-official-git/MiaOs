-- ============================================================
-- Mia-OS: Initial Schema Migration
-- Creates all enums, tables, constraints, and triggers
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE lead_type AS ENUM (
  'vocal_lesson', 'chuppah', 'private_event', 'modeling', 'other'
);

CREATE TYPE lead_status AS ENUM (
  'new', 'contacted', 'qualified', 'rejected', 'converted'
);

CREATE TYPE source_platform AS ENUM (
  'whatsapp', 'instagram', 'tiktok', 'website', 'referral', 'other'
);

CREATE TYPE booking_status AS ENUM (
  'new', 'option', 'confirmed', 'completed', 'cancelled'
);

CREATE TYPE component_type AS ENUM (
  'talent_fee', 'pianist', 'soundman', 'travel', 'flights',
  'accommodation', 'other'
);

CREATE TYPE attendance_status AS ENUM (
  'scheduled', 'attended', 'no_show', 'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'pending', 'paid', 'overdue'
);

CREATE TYPE payment_method AS ENUM (
  'bit', 'paybox', 'cash', 'check', 'bank_transfer', 'morning_api'
);

CREATE TYPE transaction_status AS ENUM (
  'pending', 'completed', 'failed', 'refunded'
);

CREATE TYPE follow_up_type AS ENUM (
  'quote_reminder', 'payment_reminder', 'warm_intro', 'general'
);

CREATE TYPE actor_type AS ENUM (
  'system', 'omer', 'mia', 'bot'
);

-- ============================================================
-- PROFILES — maps auth.users to roles (admin/talent/bot)
-- ============================================================
CREATE TABLE profiles (
  id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role  text NOT NULL CHECK (role IN ('admin', 'talent', 'bot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONTACTS — normalized people, many leads can share one contact
-- ============================================================
CREATE TABLE contacts (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name              text NOT NULL,
  phone                  text,
  email                  text,
  manychat_subscriber_id text UNIQUE,
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_contacts_phone ON contacts (phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX idx_contacts_email ON contacts (email) WHERE email IS NOT NULL;

-- ============================================================
-- LEADS — every inbound inquiry, including rejected ones
-- ============================================================
CREATE TABLE leads (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id             uuid NOT NULL REFERENCES contacts(id),
  lead_type              lead_type NOT NULL,
  status                 lead_status NOT NULL DEFAULT 'new',
  source_platform        source_platform NOT NULL DEFAULT 'other',
  manychat_subscriber_id text,
  rejection_reason       text,
  metadata               jsonb DEFAULT '{}'::jsonb,
  ai_summary             text,
  assigned_to            text,
  deleted_at             timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- rejection_reason required when status = 'rejected'
ALTER TABLE leads ADD CONSTRAINT chk_leads_rejection_reason
  CHECK (status != 'rejected' OR rejection_reason IS NOT NULL);

-- ============================================================
-- BOOKINGS — confirmed gigs, events, chuppahs
-- ============================================================
CREATE TABLE bookings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id),
  booking_type      lead_type NOT NULL,
  status            booking_status NOT NULL DEFAULT 'new',
  event_date        timestamptz NOT NULL,
  event_end_date    timestamptz,
  location_city     text,
  location_address  text,
  location_coords   point,
  total_price       numeric(10,2) DEFAULT 0,
  notes             text,
  quote_sent_at     timestamptz,
  quote_signed_at   timestamptz,
  quote_url         text,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ADD CONSTRAINT chk_bookings_event_dates
  CHECK (event_end_date IS NULL OR event_end_date > event_date);

-- ============================================================
-- BOOKING_COMPONENTS — line items for the "Lego" quote engine
-- ============================================================
CREATE TABLE booking_components (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  component_type  component_type NOT NULL,
  description     text,
  cost            numeric(10,2) NOT NULL DEFAULT 0,
  is_revenue      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- talent_fee is always revenue
ALTER TABLE booking_components ADD CONSTRAINT chk_talent_fee_revenue
  CHECK (component_type != 'talent_fee' OR is_revenue = true);

-- ============================================================
-- LESSONS — vocal lesson sessions for students
-- ============================================================
CREATE TABLE lessons (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id),
  lesson_number     int NOT NULL,
  total_lessons     int NOT NULL,
  scheduled_at      timestamptz NOT NULL,
  duration_minutes  int DEFAULT 60,
  attendance_status attendance_status NOT NULL DEFAULT 'scheduled',
  payment_status    payment_status NOT NULL DEFAULT 'pending',
  payment_amount    numeric(10,2),
  mia_notes         text,
  deleted_at        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lessons ADD CONSTRAINT chk_lesson_number
  CHECK (lesson_number >= 1 AND lesson_number <= total_lessons);

-- ============================================================
-- FINANCE_TRANSACTIONS — all money movements
-- ============================================================
CREATE TABLE finance_transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id              uuid REFERENCES bookings(id),
  lesson_id               uuid REFERENCES lessons(id),
  amount                  numeric(10,2) NOT NULL,
  payment_method          payment_method,
  status                  transaction_status NOT NULL DEFAULT 'pending',
  morning_receipt_id      text,
  due_date                date,
  paid_at                 timestamptz,
  debtor_reminder_sent_at timestamptz,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- At least one parent FK must be set
ALTER TABLE finance_transactions ADD CONSTRAINT chk_finance_has_parent
  CHECK (booking_id IS NOT NULL OR lesson_id IS NOT NULL);

-- ============================================================
-- FOLLOW_UPS — scheduled reminders and tasks
-- ============================================================
CREATE TABLE follow_ups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid REFERENCES leads(id),
  booking_id      uuid REFERENCES bookings(id),
  type            follow_up_type NOT NULL,
  scheduled_for   timestamptz NOT NULL,
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE follow_ups ADD CONSTRAINT chk_followup_has_target
  CHECK (lead_id IS NOT NULL OR booking_id IS NOT NULL);

-- ============================================================
-- ACTIVITY_LOG — polymorphic audit trail
-- ============================================================
CREATE TABLE activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  action      text NOT NULL,
  actor       actor_type NOT NULL DEFAULT 'system',
  details     jsonb DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_lessons_updated_at BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_finance_updated_at BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- VOCAL LESSON AUTO-REJECTION TRIGGER
-- Business rules: reject if gender != 'female' or age < 12
-- ============================================================
CREATE OR REPLACE FUNCTION check_vocal_lesson_rules()
RETURNS trigger AS $$
DECLARE
  v_gender text;
  v_age    int;
BEGIN
  IF NEW.lead_type = 'vocal_lesson' AND NEW.status = 'new' THEN
    v_gender := NEW.metadata->>'gender';
    v_age    := (NEW.metadata->>'age')::int;

    IF v_gender IS NOT NULL AND lower(v_gender) != 'female' THEN
      NEW.status := 'rejected';
      NEW.rejection_reason := 'gender';
    ELSIF v_age IS NOT NULL AND v_age < 12 THEN
      NEW.status := 'rejected';
      NEW.rejection_reason := 'age';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vocal_lesson_auto_reject
  BEFORE INSERT ON leads
  FOR EACH ROW EXECUTE FUNCTION check_vocal_lesson_rules();
