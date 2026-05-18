-- Add new triage steps: language selection, name collection, date collection
ALTER TYPE triage_status ADD VALUE IF NOT EXISTS 'awaiting_language' BEFORE 'awaiting_name';
ALTER TYPE triage_status ADD VALUE IF NOT EXISTS 'awaiting_name' BEFORE 'awaiting_response';
ALTER TYPE triage_status ADD VALUE IF NOT EXISTS 'awaiting_date' AFTER 'awaiting_response';

-- Store selected language, service choice, and requested date on the session
ALTER TABLE triage_sessions ADD COLUMN IF NOT EXISTS language text DEFAULT 'he';
ALTER TABLE triage_sessions ADD COLUMN IF NOT EXISTS selected_service text;
ALTER TABLE triage_sessions ADD COLUMN IF NOT EXISTS requested_date date;

-- Recreate unique index to include all active statuses
DROP INDEX IF EXISTS idx_triage_active_chat;
CREATE UNIQUE INDEX idx_triage_active_chat
  ON triage_sessions (chat_id)
  WHERE status IN ('awaiting_language', 'awaiting_name', 'awaiting_response', 'awaiting_date');
