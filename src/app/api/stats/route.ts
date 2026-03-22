import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServiceClient();

    // Fetch dashboard stats from the view
    const { data: statsRow, error: statsError } = await sb
      .from('v_dashboard_stats')
      .select('*')
      .single();

    if (statsError) {
      console.error('[api/stats] stats', statsError.message);
      return Response.json({ error: statsError.message }, { status: 500 });
    }

    // Calculate potential revenue from option-status bookings
    const { data: optionBookings } = await sb
      .from('booking_components')
      .select('cost, is_revenue, bookings!inner(status)')
      .eq('bookings.status', 'option')
      .eq('is_revenue', true);

    const potentialRevenue = (optionBookings ?? []).reduce(
      (sum, c) => sum + (c.cost ?? 0),
      0
    );

    // Count expired options (option for 7+ days without signing)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: expiredOptions } = await sb
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'option')
      .is('deleted_at', null)
      .lt('updated_at', sevenDaysAgo);

    // Fetch 5 most recent leads with contact info
    const { data: recentLeads, error: leadsError } = await sb
      .from('leads')
      .select('*, contacts!inner(full_name, phone, email)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (leadsError) {
      console.error('[api/stats] recent leads', leadsError.message);
      return Response.json({ error: leadsError.message }, { status: 500 });
    }

    return Response.json({
      stats: statsRow,
      recent_leads: recentLeads ?? [],
      potential_revenue: potentialRevenue,
      expired_options: expiredOptions ?? 0,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/stats]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
