import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bookingId = searchParams.get('booking_id');

    const sb = createServiceClient();

    let query = sb
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false });

    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }

    const { data, error } = await query;

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ quotes: data ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      title,
      description,
      items,
      total_amount,
      payment_terms,
      general_terms,
      valid_until,
    } = body;

    if (!booking_id || !title) {
      return Response.json(
        { error: 'booking_id and title are required' },
        { status: 400 },
      );
    }

    const sb = createServiceClient();

    const { data, error } = await sb
      .from('quotes')
      .insert({
        booking_id,
        title,
        description: description ?? null,
        items: items ?? [],
        total_amount: total_amount ?? 0,
        payment_terms: payment_terms ?? {},
        general_terms: general_terms ?? null,
        valid_until: valid_until ?? null,
      })
      .select('*')
      .single();

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Update booking quote_url
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const quoteUrl = `${appUrl}/quote/${data.token}`;
    await sb
      .from('bookings')
      .update({ quote_url: quoteUrl })
      .eq('id', booking_id);

    return Response.json({ ...data, url: quoteUrl }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
