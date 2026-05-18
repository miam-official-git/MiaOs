-- ============================================================
-- Migration 00012: Triage V2 — Multi-step service flows
-- Adds new lead types, triage statuses, and flow tracking columns
-- ============================================================

-- New lead types from Miro decision tree
ALTER TYPE lead_type ADD VALUE IF NOT EXISTS 'musical_production';
ALTER TYPE lead_type ADD VALUE IF NOT EXISTS 'collaboration';
ALTER TYPE lead_type ADD VALUE IF NOT EXISTS 'international_event';
ALTER TYPE lead_type ADD VALUE IF NOT EXISTS 'consultation';
ALTER TYPE lead_type ADD VALUE IF NOT EXISTS 'marriage_proposal';

-- New source platforms
ALTER TYPE source_platform ADD VALUE IF NOT EXISTS 'facebook';
ALTER TYPE source_platform ADD VALUE IF NOT EXISTS 'youtube';

-- New triage status for multi-step detail collection
ALTER TYPE triage_status ADD VALUE IF NOT EXISTS 'collecting_details' AFTER 'awaiting_response';

-- Columns for multi-step flow tracking
ALTER TABLE triage_sessions ADD COLUMN IF NOT EXISTS current_step integer NOT NULL DEFAULT 0;
ALTER TABLE triage_sessions ADD COLUMN IF NOT EXISTS collected_data jsonb NOT NULL DEFAULT '{}';

-- Update unique index to include new active status
DROP INDEX IF EXISTS idx_triage_active_chat;
CREATE UNIQUE INDEX idx_triage_active_chat
  ON triage_sessions (chat_id)
  WHERE status IN ('awaiting_language', 'awaiting_name', 'awaiting_response', 'awaiting_date', 'collecting_details');

-- Update status index
DROP INDEX IF EXISTS idx_triage_status;
CREATE INDEX idx_triage_status ON triage_sessions (chat_id, status)
  WHERE status IN ('awaiting_language', 'awaiting_name', 'awaiting_response', 'awaiting_date', 'collecting_details', 'paused');
