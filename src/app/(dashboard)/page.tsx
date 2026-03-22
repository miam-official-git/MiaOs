import { createServiceClient } from '@/lib/supabase';
import { StatsCards } from '@/components/stats-cards';
import { RecentLeads } from '@/components/recent-leads';
import { FollowUpWidget } from '@/components/follow-up-widget';
import { FollowUpCandidatesWidget } from '@/components/follow-up-candidates-widget';

export default async function DashboardPage() {
  const sb = createServiceClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [statsResult, contactedResult, qualifiedResult, confirmedResult, debtResult, leadsResult, optionComponentsResult, expiredOptionsResult] =
    await Promise.all([
      // New leads count
      sb
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new')
        .is('deleted_at', null),
      // Contacted leads count
      sb
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'contacted')
        .is('deleted_at', null),
      // Qualified leads count
      sb
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'qualified')
        .is('deleted_at', null),
      // Confirmed bookings count
      sb
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'confirmed')
        .is('deleted_at', null),
      // Outstanding debt total
      sb
        .from('finance_transactions')
        .select('amount')
        .eq('status', 'pending'),
      // Recent leads
      sb
        .from('leads')
        .select('*, contacts!inner(full_name, phone, email)')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5),
      // Option booking components (revenue) for potential revenue KPI
      sb
        .from('booking_components')
        .select('cost, is_revenue, bookings!inner(status)')
        .eq('bookings.status', 'option')
        .eq('is_revenue', true),
      // Expired options count (option for 7+ days)
      sb
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'option')
        .is('deleted_at', null)
        .lt('updated_at', sevenDaysAgo),
    ]);

  const outstandingDebt = (debtResult.data ?? []).reduce(
    (sum, t) => sum + (t.amount ?? 0),
    0
  );

  const potentialRevenue = (optionComponentsResult.data ?? []).reduce(
    (sum, c: { cost: number }) => sum + (c.cost ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">דשבורד</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          סקירה כללית של הפעילות העסקית
        </p>
      </div>

      <StatsCards
        stats={{
          new_leads: statsResult.count ?? 0,
          contacted_leads: contactedResult.count ?? 0,
          qualified_leads: qualifiedResult.count ?? 0,
          confirmed_bookings: confirmedResult.count ?? 0,
          outstanding_debt: outstandingDebt,
        }}
        potentialRevenue={potentialRevenue}
        expiredOptions={expiredOptionsResult.count ?? 0}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FollowUpWidget />
        <FollowUpCandidatesWidget />
      </div>

      <RecentLeads leads={leadsResult.data ?? []} />
    </div>
  );
}
