import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServiceClient();

    const { data, error } = await sb
      .from('v_follow_up_candidates')
      .select('*');

    if (error) {
      console.error('[api/follow-ups/candidates] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ candidates: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/follow-ups/candidates] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
