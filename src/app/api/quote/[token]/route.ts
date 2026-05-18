import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const sb = createServiceClient();

    const { data: quote, error } = await sb
      .from('quotes')
      .select('*, bookings(booking_type, event_date, event_end_date, event_start_time, event_end_time, location_city, location_address, leads(contacts(full_name, phone, email)))')
      .eq('token', token)
      .single();

    if (error || !quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Mark as viewed on first view
    if (!quote.viewed_at) {
      await sb
        .from('quotes')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', quote.id);
    }

    return Response.json(quote);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
