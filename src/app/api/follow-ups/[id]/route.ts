import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    const { data, error } = await sb
      .from('follow_ups')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/follow-ups/[id]] PATCH', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return Response.json({ error: 'Follow-up not found' }, { status: 404 });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/follow-ups/[id]] PATCH', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
