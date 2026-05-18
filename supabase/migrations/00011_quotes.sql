-- Quote system for proposals/price quotes
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,

  -- Content
  title text NOT NULL,
  description text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric NOT NULL DEFAULT 0,

  -- Payment terms
  payment_terms jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- General terms & conditions
  general_terms text,

  -- Validity
  valid_until date,

  -- Tracking
  sent_at timestamptz,
  sent_via text,
  viewed_at timestamptz,

  -- Signature
  signer_name text,
  signer_id_number text,
  signature_data text,
  signed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_booking ON quotes(booking_id);

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on quotes"
  ON quotes FOR ALL
  USING (true)
  WITH CHECK (true);
