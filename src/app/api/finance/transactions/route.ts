import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('payment_method');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const sb = createServiceClient();

    let query = sb
      .from('finance_transactions')
      .select(
        '*, bookings(id, booking_type, event_date, status), lessons(id, lesson_number, scheduled_at)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (paymentMethod) {
      query = query.eq('payment_method', paymentMethod);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: transactions, count, error } = await query;

    if (error) {
      console.error('[api/finance/transactions]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      transactions: transactions ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/finance/transactions]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, payment_method, status, booking_id, lesson_id, due_date, notes } = body;

    if (amount == null || amount <= 0) {
      return Response.json({ error: 'amount is required and must be positive' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data, error } = await sb
      .from('finance_transactions')
      .insert({
        amount,
        payment_method: payment_method ?? null,
        status: status ?? 'pending',
        booking_id: booking_id ?? null,
        lesson_id: lesson_id ?? null,
        due_date: due_date ?? null,
        notes: notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[api/finance/transactions POST]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(data, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/finance/transactions POST]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
