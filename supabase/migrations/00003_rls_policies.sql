-- ============================================================
-- Mia-OS: Row Level Security Policies
-- Roles: admin (Omer), talent (Mia), bot (service_role bypasses)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER: check user role
-- ============================================================
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ADMIN (Omer): full access to all tables
-- ============================================================
CREATE POLICY admin_all_profiles ON profiles
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_contacts ON contacts
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_leads ON leads
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_bookings ON bookings
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_components ON booking_components
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_lessons ON lessons
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_finance ON finance_transactions
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_followups ON follow_ups
  FOR ALL USING (auth_role() = 'admin');

CREATE POLICY admin_all_activity ON activity_log
  FOR ALL USING (auth_role() = 'admin');

-- ============================================================
-- TALENT (Mia): read access to most tables, write to lesson notes
-- ============================================================

-- Mia can read contacts
CREATE POLICY talent_read_contacts ON contacts
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read leads
CREATE POLICY talent_read_leads ON leads
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read bookings
CREATE POLICY talent_read_bookings ON bookings
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read booking components
CREATE POLICY talent_read_components ON booking_components
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read and update lessons (for notes and attendance)
CREATE POLICY talent_read_lessons ON lessons
  FOR SELECT USING (auth_role() = 'talent');

CREATE POLICY talent_update_lessons ON lessons
  FOR UPDATE USING (auth_role() = 'talent')
  WITH CHECK (auth_role() = 'talent');

-- Mia can read finance (to see payment status)
CREATE POLICY talent_read_finance ON finance_transactions
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read follow-ups
CREATE POLICY talent_read_followups ON follow_ups
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read activity log
CREATE POLICY talent_read_activity ON activity_log
  FOR SELECT USING (auth_role() = 'talent');

-- Mia can read her own profile
CREATE POLICY talent_read_profile ON profiles
  FOR SELECT USING (id = auth.uid());

-- ============================================================
-- NOTE: Bot/System access
-- ManyChat webhooks and cron jobs use the Supabase service_role
-- key, which bypasses RLS entirely. No policies needed.
-- ============================================================
