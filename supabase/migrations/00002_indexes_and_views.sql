-- ============================================================
-- Mia-OS: Indexes, Functions, and Views
-- ============================================================

-- ============================================================
-- INDEXES
-- ============================================================

-- Leads
CREATE INDEX idx_leads_status ON leads (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_lead_type ON leads (lead_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_source ON leads (source_platform);
CREATE INDEX idx_leads_contact ON leads (contact_id);
CREATE INDEX idx_leads_created ON leads (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_manychat ON leads (manychat_subscriber_id)
  WHERE manychat_subscriber_id IS NOT NULL;

-- Bookings
CREATE INDEX idx_bookings_dates ON bookings (event_date, event_end_date)
  WHERE deleted_at IS NULL AND status IN ('option', 'confirmed');
CREATE INDEX idx_bookings_status ON bookings (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bookings_lead ON bookings (lead_id);
CREATE INDEX idx_bookings_type ON bookings (booking_type);

-- Lessons
CREATE INDEX idx_lessons_scheduled ON lessons (scheduled_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_lessons_lead ON lessons (lead_id);
CREATE INDEX idx_lessons_payment ON lessons (payment_status) WHERE deleted_at IS NULL;

-- Finance
CREATE INDEX idx_finance_status ON finance_transactions (status);
CREATE INDEX idx_finance_due ON finance_transactions (due_date)
  WHERE status = 'pending';
CREATE INDEX idx_finance_booking ON finance_transactions (booking_id)
  WHERE booking_id IS NOT NULL;
CREATE INDEX idx_finance_lesson ON finance_transactions (lesson_id)
  WHERE lesson_id IS NOT NULL;

-- Follow-ups
CREATE INDEX idx_followups_pending ON follow_ups (scheduled_for)
  WHERE completed_at IS NULL;

-- Activity log
CREATE INDEX idx_activity_entity ON activity_log (entity_type, entity_id, created_at DESC);

-- ============================================================
-- FUNCTION: detect_booking_conflicts
-- Returns bookings that overlap with a proposed time range
-- ============================================================
CREATE OR REPLACE FUNCTION detect_booking_conflicts(
  p_start              timestamptz,
  p_end                timestamptz,
  p_exclude_booking_id uuid DEFAULT NULL
)
RETURNS TABLE (
  booking_id     uuid,
  booking_type   lead_type,
  status         booking_status,
  event_date     timestamptz,
  event_end_date timestamptz,
  location_city  text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.booking_type,
    b.status,
    b.event_date,
    b.event_end_date,
    b.location_city
  FROM bookings b
  WHERE b.deleted_at IS NULL
    AND b.status IN ('option', 'confirmed')
    AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
    AND b.event_date < p_end
    AND COALESCE(b.event_end_date, b.event_date + interval '2 hours') > p_start;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- FUNCTION: booking_net_profit
-- Calculates revenue minus costs from booking components
-- ============================================================
CREATE OR REPLACE FUNCTION booking_net_profit(p_booking_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(
    SUM(CASE WHEN is_revenue THEN cost ELSE -cost END), 0
  )
  FROM booking_components
  WHERE booking_id = p_booking_id;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- VIEW: v_debtors — people who received service but haven't paid
-- ============================================================
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
  les.scheduled_at AS service_date
FROM finance_transactions ft
JOIN lessons les ON les.id = ft.lesson_id
JOIN leads l ON l.id = les.lead_id
JOIN contacts c ON c.id = l.contact_id
WHERE ft.status = 'pending'
  AND les.attendance_status = 'attended';

-- ============================================================
-- VIEW: v_follow_up_candidates — unsigned quotes older than 3 days
-- ============================================================
CREATE OR REPLACE VIEW v_follow_up_candidates AS
SELECT
  b.id AS booking_id,
  l.id AS lead_id,
  c.full_name,
  c.phone,
  b.booking_type,
  b.quote_sent_at,
  b.total_price,
  now() - b.quote_sent_at AS time_since_quote
FROM bookings b
JOIN leads l ON l.id = b.lead_id
JOIN contacts c ON c.id = l.contact_id
WHERE b.deleted_at IS NULL
  AND b.quote_sent_at IS NOT NULL
  AND b.quote_signed_at IS NULL
  AND b.status IN ('new', 'option')
  AND b.quote_sent_at < now() - interval '3 days'
  AND NOT EXISTS (
    SELECT 1 FROM follow_ups fu
    WHERE fu.booking_id = b.id
      AND fu.type = 'quote_reminder'
      AND fu.completed_at IS NULL
  );

-- ============================================================
-- VIEW: v_dashboard_stats — high-level KPIs for the dashboard
-- ============================================================
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT
  (SELECT count(*) FROM leads
   WHERE status = 'new' AND deleted_at IS NULL)
    AS new_leads,

  (SELECT count(*) FROM bookings
   WHERE status = 'confirmed' AND deleted_at IS NULL
     AND event_date >= date_trunc('month', now()))
    AS confirmed_this_month,

  (SELECT count(*) FROM lessons
   WHERE scheduled_at >= now()
     AND attendance_status = 'scheduled'
     AND deleted_at IS NULL)
    AS upcoming_lessons,

  (SELECT COALESCE(sum(amount), 0) FROM finance_transactions
   WHERE status = 'pending')
    AS total_outstanding,

  (SELECT count(*) FROM follow_ups
   WHERE completed_at IS NULL AND scheduled_for <= now())
    AS overdue_followups;
