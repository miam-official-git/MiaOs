import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const { signer_name, signer_id_number, signature_data } = body;

    if (!signer_name || !signature_data) {
      return Response.json(
        { error: 'signer_name and signature_data are required' },
        { status: 400 },
      );
    }

    const sb = createServiceClient();

    // Verify quote exists and not already signed
    const { data: quote, error: fetchError } = await sb
      .from('quotes')
      .select('id, booking_id, signed_at')
      .eq('token', token)
      .single();

    if (fetchError || !quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    if (quote.signed_at) {
      return Response.json({ error: 'Quote already signed' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { error: updateError } = await sb
      .from('quotes')
      .update({
        signer_name,
        signer_id_number: signer_id_number ?? null,
        signature_data,
        signed_at: now,
        updated_at: now,
      })
      .eq('id', quote.id);

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 500 });
    }

    // Update booking
    await sb
      .from('bookings')
      .update({ quote_signed_at: now })
      .eq('id', quote.booking_id);

    return Response.json({ signed: true, signed_at: now });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
