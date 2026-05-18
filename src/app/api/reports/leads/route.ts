import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('leads')
      .select('status, lead_type, created_at')
      .is('deleted_at', null)
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const leads = data ?? [];
    const total = leads.length;

    // Status funnel
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};

    for (const lead of leads) {
      statusCounts[lead.status] = (statusCounts[lead.status] ?? 0) + 1;
      typeCounts[lead.lead_type] = (typeCounts[lead.lead_type] ?? 0) + 1;
    }

    const converted = statusCounts['converted'] ?? 0;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    return Response.json({
      year,
      total,
      statusCounts,
      typeCounts,
      conversionRate,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
