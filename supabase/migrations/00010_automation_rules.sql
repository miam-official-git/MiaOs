-- ============================================================
-- Mia-OS: Automation rules for follow-up actions
-- ============================================================

CREATE TABLE IF NOT EXISTS automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  trigger_type text NOT NULL
    CHECK (trigger_type IN ('lead_stale', 'quote_unsigned', 'payment_overdue', 'post_event', 'triage_stale')),
  delay_hours int NOT NULL DEFAULT 48,
  action_type text NOT NULL DEFAULT 'create_followup'
    CHECK (action_type IN ('create_followup', 'send_whatsapp', 'both')),
  message_template text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_automation_rules ON automation_rules
  FOR ALL USING (auth_role() = 'admin');

-- Default rules
INSERT INTO automation_rules (name, description, trigger_type, delay_hours, action_type, message_template) VALUES
  ('lead_stale', 'ליד חדש שלא טופל', 'lead_stale', 48, 'create_followup', NULL),
  ('quote_unsigned', 'הצעת מחיר לא חתומה', 'quote_unsigned', 120, 'create_followup', NULL),
  ('payment_overdue', 'תשלום שעבר תאריך יעד', 'payment_overdue', 24, 'create_followup', NULL),
  ('post_event', 'הודעת תודה אחרי אירוע', 'post_event', 24, 'create_followup', NULL),
  ('triage_stale', 'טריאז׳ שלא הושלם', 'triage_stale', 24, 'send_whatsapp', NULL)
ON CONFLICT (name) DO NOTHING;
