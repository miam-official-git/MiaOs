import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('finance_transactions')
      .select('amount, status, paid_at, created_at')
      .eq('status', 'completed')
      .gte('paid_at', `${year}-01-01`)
      .lt('paid_at', `${year + 1}-01-01`);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Group by month
    const monthly: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) monthly[m] = 0;

    for (const tx of data ?? []) {
      const date = new Date(tx.paid_at);
      const m = date.getMonth() + 1;
      monthly[m] += tx.amount;
    }

    const months = Object.entries(monthly).map(([month, amount]) => ({
      month: parseInt(month, 10),
      amount,
    }));

    const total = months.reduce((sum, m) => sum + m.amount, 0);

    return Response.json({ year, months, total });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
