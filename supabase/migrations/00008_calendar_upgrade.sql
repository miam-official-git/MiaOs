-- ============================================================
-- Mia-OS: Calendar upgrade — blocked periods, reminders,
-- and time columns on bookings for hourly scheduling.
-- ============================================================

-- 1. Blocked periods (Mia unavailable)
CREATE TABLE IF NOT EXISTS blocked_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  created_by text NOT NULL DEFAULT 'omer'
    CHECK (created_by IN ('system', 'omer', 'mia', 'bot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_blocked_periods_dates
  ON blocked_periods (start_date, end_date);

ALTER TABLE blocked_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_blocked_periods ON blocked_periods
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY talent_read_blocked_periods ON blocked_periods
  FOR SELECT USING (auth_role() = 'talent');

-- 2. Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES contacts(id) ON DELETE SET NULL,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
  reminder_type text NOT NULL
    CHECK (reminder_type IN ('day_before', 'hour_before', 'custom')),
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  message_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_pending
  ON reminders (scheduled_for) WHERE sent_at IS NULL;

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_reminders ON reminders
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY talent_read_reminders ON reminders
  FOR SELECT USING (auth_role() = 'talent');

-- 3. Add time columns to bookings for hourly scheduling
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS event_start_time time,
  ADD COLUMN IF NOT EXISTS event_end_time time;
