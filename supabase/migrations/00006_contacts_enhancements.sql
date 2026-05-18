-- ============================================================
-- Mia-OS: Contact enhancements — notes system
-- ============================================================

CREATE TABLE IF NOT EXISTS contact_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  content text NOT NULL,
  author text NOT NULL DEFAULT 'omer'
    CHECK (author IN ('system', 'omer', 'mia', 'bot')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_notes_contact
  ON contact_notes (contact_id, created_at DESC);

-- RLS
ALTER TABLE contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_all_contact_notes ON contact_notes
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY talent_read_contact_notes ON contact_notes
  FOR SELECT USING (auth_role() = 'talent');
