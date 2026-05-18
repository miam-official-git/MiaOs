-- ============================================================
-- Mia-OS: Communication log for manual interaction tracking
-- WhatsApp messages are already in the 'messages' table;
-- this table stores phone calls, meetings, emails, and notes.
-- ============================================================

CREATE TABLE IF NOT EXISTS communication_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  comm_type text NOT NULL CHECK (comm_type IN ('phone_call', 'meeting', 'email', 'note')),
  direction text CHECK (direction IN ('inbound', 'outbound')),
  summary text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  logged_by text NOT NULL DEFAULT 'omer'
    CHECK (logged_by IN ('system', 'omer', 'mia', 'bot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_comm_log_contact
  ON communication_log (contact_id, created_at DESC);

-- RLS
ALTER TABLE communication_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_comm_log ON communication_log
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY talent_read_comm_log ON communication_log
  FOR SELECT USING (auth_role() = 'talent');
