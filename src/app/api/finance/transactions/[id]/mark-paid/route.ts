import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const paymentMethod = body.payment_method ?? null;

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('finance_transactions')
      .update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        ...(paymentMethod && { payment_method: paymentMethod }),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
