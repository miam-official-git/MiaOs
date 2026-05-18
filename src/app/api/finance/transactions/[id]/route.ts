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
      .from('finance_transactions')
      .select(
        '*, bookings(id, booking_type, event_date, status), lessons(id, lesson_number, scheduled_at)',
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('[api/finance/transactions/id]', error.message);
      const status = error.code === 'PGRST116' ? 404 : 500;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/finance/transactions/id]', message);
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

    const allowed = ['status', 'payment_method', 'payment_stage', 'paid_at', 'notes'] as const;
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data, error } = await sb
      .from('finance_transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[api/finance/transactions/id PATCH]', error.message);
      const status = error.code === 'PGRST116' ? 404 : 500;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/finance/transactions/id PATCH]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
