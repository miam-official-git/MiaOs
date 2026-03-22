import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServiceClient();

    const { data: debtors, error } = await sb
      .from('v_debtors')
      .select('*')
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[api/finance/debtors]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const total_debt = (debtors ?? []).reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0,
    );

    return Response.json({
      debtors: debtors ?? [],
      total_debt,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/finance/debtors]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
