import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import type { FollowUpInsert } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const status = searchParams.get('status'); // 'pending' | 'completed'

    const sb = createServiceClient();

    let query = sb
      .from('follow_ups')
      .select('*, leads!left(id, contact_id, contacts!inner(full_name, phone))')
      .order('scheduled_for', { ascending: true });

    if (type) {
      query = query.eq('type', type);
    }

    if (status === 'completed') {
      query = query.not('completed_at', 'is', null);
    } else if (status === 'pending') {
      query = query.is('completed_at', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[api/follow-ups] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ follow_ups: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/follow-ups] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as FollowUpInsert;

    const sb = createServiceClient();

    const { data, error } = await sb
      .from('follow_ups')
      .insert(body)
      .select('*')
      .single();

    if (error) {
      console.error('[api/follow-ups] POST', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/follow-ups] POST', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
