import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sendTextMessage } from '@/lib/greenapi-client';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    const { data: quote, error } = await sb
      .from('quotes')
      .select('*, bookings(*, leads(*, contacts(*)))')
      .eq('id', id)
      .single();

    if (error || !quote) {
      return Response.json({ error: 'Quote not found' }, { status: 404 });
    }

    const booking = quote.bookings as unknown as {
      leads: { contacts: { full_name: string; phone: string | null; whatsapp_chat_id: string | null } };
    };
    const contact = booking?.leads?.contacts;

    if (!contact?.phone && !contact?.whatsapp_chat_id) {
      return Response.json({ error: 'No phone number for contact' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const quoteUrl = `${appUrl}/quote/${quote.token}`;

    const chatId = contact.whatsapp_chat_id
      ?? `${contact.phone?.replace(/\D/g, '')}@c.us`;

    const message = [
      `שלום ${contact.full_name} 👋`,
      '',
      `הצעת המחיר שלך מ-Mia Mesharki מוכנה:`,
      quoteUrl,
      '',
      `ניתן לצפות, לאשר ולחתום ישירות מהלינק.`,
      quote.valid_until ? `ההצעה תקפה עד ${new Date(quote.valid_until).toLocaleDateString('he-IL')}` : '',
    ].filter(Boolean).join('\n');

    const result = await sendTextMessage(chatId, message);

    await sb
      .from('quotes')
      .update({ sent_at: new Date().toISOString(), sent_via: 'whatsapp' })
      .eq('id', id);

    await sb
      .from('bookings')
      .update({ quote_sent_at: new Date().toISOString(), quote_url: quoteUrl })
      .eq('id', quote.booking_id);

    return Response.json({ sent: true, message_id: result.idMessage, url: quoteUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
