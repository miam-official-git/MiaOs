import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from('automation_rules')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ rules: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
