-- ============================================================
-- Mia-OS: Payment stages — deposit, interim, final, full
-- ============================================================

-- 1. Add payment_stage column
ALTER TABLE finance_transactions
  ADD COLUMN IF NOT EXISTS payment_stage text NOT NULL DEFAULT 'full'
    CHECK (payment_stage IN ('deposit', 'interim', 'final', 'full'));

-- 2. Recreate v_debtors to include payment_stage
CREATE OR REPLACE VIEW v_debtors AS
-- Booking debtors
SELECT
  c.id AS contact_id,
  c.full_name,
  c.phone,
  c.email,
  'booking'::text AS source_type,
  b.id AS source_id,
  ft.id AS transaction_id,
  ft.amount,
  ft.due_date,
  ft.debtor_reminder_sent_at,
  ft.payment_stage,
  b.event_date AS service_date
FROM finance_transactions ft
JOIN bookings b ON b.id = ft.booking_id
JOIN leads l ON l.id = b.lead_id
JOIN contacts c ON c.id = l.contact_id
WHERE ft.status = 'pending'
  AND b.status IN ('completed', 'confirmed')

UNION ALL

-- Lesson debtors
SELECT
  c.id AS contact_id,
  c.full_name,
  c.phone,
  c.email,
  'lesson'::text AS source_type,
  les.id AS source_id,
  ft.id AS transaction_id,
  ft.amount,
  ft.due_date,
  ft.debtor_reminder_sent_at,
  ft.payment_stage,
  les.scheduled_at AS service_date
FROM finance_transactions ft
JOIN lessons les ON les.id = ft.lesson_id
JOIN leads l ON l.id = les.lead_id
JOIN contacts c ON c.id = l.contact_id
WHERE ft.status = 'pending'
  AND les.attendance_status = 'attended';
