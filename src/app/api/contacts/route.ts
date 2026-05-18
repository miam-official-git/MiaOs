import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.trim() ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '30', 10)));
    const offset = (page - 1) * limit;

    const sb = createServiceClient();

    let query = sb
      .from('contacts')
      .select('*, leads(id, status, lead_type)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[api/contacts] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const contacts = (data ?? []).map((c) => {
      const leads = Array.isArray(c.leads) ? c.leads : [];
      return {
        ...c,
        leads_count: leads.length,
        active_leads: leads.filter((l: { status: string }) => !['archived', 'rejected', 'lost'].includes(l.status)).length,
        leads: undefined,
      };
    });

    return Response.json({
      contacts,
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/contacts] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
