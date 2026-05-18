-- ============================================================
-- Mia-OS: Messages, Triage Sessions, Green API support
-- Migration 00004
-- ============================================================

-- ============================================================
-- FIX: lead_status enum drift (SQL has 5, TypeScript uses 9)
-- ============================================================
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'quoted';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'negotiating';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'lost';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'archived';

-- ============================================================
-- NEW ENUMS
-- ============================================================
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

CREATE TYPE message_content_type AS ENUM (
  'text', 'image', 'video', 'audio', 'voice', 'document',
  'location', 'contact', 'sticker', 'other'
);

CREATE TYPE triage_status AS ENUM (
  'awaiting_response', 'completed', 'paused', 'expired'
);

-- ============================================================
-- ALTER contacts: add whatsapp_chat_id
-- ============================================================
ALTER TABLE contacts ADD COLUMN whatsapp_chat_id text;

CREATE UNIQUE INDEX idx_contacts_whatsapp_chat_id
  ON contacts (whatsapp_chat_id)
  WHERE whatsapp_chat_id IS NOT NULL;

-- ============================================================
-- MESSAGES — every WhatsApp message mirrored for research/ROI
-- ============================================================
CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id          uuid REFERENCES contacts(id),
  direction           message_direction NOT NULL,
  message_type        message_content_type NOT NULL DEFAULT 'text',
  content             text,
  sender_phone        text,
  sender_name         text,
  chat_id             text NOT NULL,
  greenapi_id_message text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_chat_id ON messages (chat_id, created_at DESC);
CREATE INDEX idx_messages_contact ON messages (contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;
CREATE UNIQUE INDEX idx_messages_greenapi_id ON messages (greenapi_id_message)
  WHERE greenapi_id_message IS NOT NULL;
CREATE INDEX idx_messages_created ON messages (created_at DESC);

-- ============================================================
-- TRIAGE_SESSIONS — tracks per-chat bot conversation state
-- ============================================================
CREATE TABLE triage_sessions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id              uuid REFERENCES contacts(id),
  chat_id                 text NOT NULL,
  status                  triage_status NOT NULL DEFAULT 'awaiting_response',
  triage_message_sent_at  timestamptz,
  response_received_at    timestamptz,
  selected_lead_type      lead_type,
  paused_until            timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_triage_active_chat
  ON triage_sessions (chat_id)
  WHERE status = 'awaiting_response';

CREATE INDEX idx_triage_status ON triage_sessions (chat_id, status)
  WHERE status IN ('awaiting_response', 'paused');

CREATE TRIGGER trg_triage_sessions_updated_at
  BEFORE UPDATE ON triage_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS: messages
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_messages ON messages
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY talent_read_messages ON messages
  FOR SELECT USING (auth_role() = 'talent');

-- ============================================================
-- RLS: triage_sessions
-- ============================================================
ALTER TABLE triage_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_triage ON triage_sessions
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY talent_read_triage ON triage_sessions
  FOR SELECT USING (auth_role() = 'talent');
