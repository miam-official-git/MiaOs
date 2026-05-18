import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, total_amount, deposit_percent = 30 } = body;

    if (!booking_id || !total_amount) {
      return Response.json(
        { error: 'booking_id and total_amount are required' },
        { status: 400 },
      );
    }

    const depositAmount = Math.round(total_amount * (deposit_percent / 100));
    const finalAmount = total_amount - depositAmount;

    const sb = createServiceClient();

    const { data: transactions, error } = await sb
      .from('finance_transactions')
      .insert([
        {
          booking_id,
          amount: depositAmount,
          payment_stage: 'deposit',
          status: 'pending',
        },
        {
          booking_id,
          amount: finalAmount,
          payment_stage: 'final',
          status: 'pending',
        },
      ])
      .select();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ transactions }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
