import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientType = searchParams.get('client_type');
    const status = searchParams.get('status') ?? 'active';
    const search = searchParams.get('search');

    const sb = createServiceClient();

    let query = sb
      .from('clients')
      .select('*, contacts!inner(full_name, phone, email), leads(id, lead_type)')
      .eq('status', status)
      .order('client_since', { ascending: false });

    if (clientType) {
      query = query.eq('client_type', clientType);
    }

    if (search) {
      query = query.ilike('contacts.full_name', `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[api/clients]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ clients: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/clients]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = createServiceClient();

    const { data, error } = await sb
      .from('clients')
      .insert({
        contact_id: body.contact_id,
        lead_id: body.lead_id ?? null,
        client_type: body.client_type,
        status: body.status ?? 'active',
        client_since: body.client_since ?? new Date().toISOString(),
        notes: body.notes ?? null,
      })
      .select('*, contacts!inner(full_name, phone, email)')
      .single();

    if (error) {
      if (error.code === '23505') {
        return Response.json(
          { error: 'לקוח פעיל מסוג זה כבר קיים עבור איש קשר זה' },
          { status: 409 },
        );
      }
      console.error('[api/clients] POST', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/clients] POST', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
