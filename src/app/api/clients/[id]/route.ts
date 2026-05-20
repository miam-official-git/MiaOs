import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    const { data, error } = await sb
      .from('clients')
      .select('*, contacts!inner(full_name, phone, email), leads(id, lead_type, status)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('[api/clients/id]', error.message);
      return Response.json({ error: error.message }, { status: 404 });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const sb = createServiceClient();

    const updates: Record<string, unknown> = {};
    if (body.status !== undefined) updates.status = body.status;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.client_type !== undefined) updates.client_type = body.client_type;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await sb
      .from('clients')
      .update(updates)
      .eq('id', id)
      .select('*, contacts!inner(full_name, phone, email)')
      .single();

    if (error) {
      console.error('[api/clients/id] PATCH', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
