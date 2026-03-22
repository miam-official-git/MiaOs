import { NextRequest, NextResponse } from 'next/server';
import {
  validateManyChatPayload,
  mapManyChatToContact,
  mapManyChatToLead,
} from '@/lib/webhook-utils';
import { upsertContact, createLead, logActivity } from '@/lib/supabase-admin';
import type { WebhookResponse } from '@/types/manychat';

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body
    const body = await request.json();

    // 2. Verify webhook secret (optional — skip if env var not set)
    const secret = process.env.MANYCHAT_WEBHOOK_SECRET;
    if (secret) {
      const headerSecret = request.headers.get('x-webhook-secret');
      if (headerSecret !== secret) {
        return NextResponse.json<WebhookResponse>(
          { success: false, error: 'Invalid webhook secret' },
          { status: 401 },
        );
      }
    }

    // 3. Validate payload
    const validation = validateManyChatPayload(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json<WebhookResponse>(
        { success: false, error: validation.error ?? 'Invalid payload' },
        { status: 400 },
      );
    }
    const payload = validation.data;

    // 4. Map to contact and upsert
    const contactData = mapManyChatToContact(payload);
    const contact = await upsertContact(contactData);

    // 5. Map to lead and create
    const leadData = mapManyChatToLead(payload, contact.id);
    const lead = await createLead(leadData);

    // 6. Log activity
    await logActivity('lead', lead.id, 'created_from_manychat', 'bot', {
      subscriber_id: payload.subscriber_id,
      source: payload.source ?? null,
    });

    // 7. Return response
    return NextResponse.json<WebhookResponse>({
      success: true,
      lead_id: lead.id,
      status: lead.status,
      rejection_reason: lead.rejection_reason,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[manychat-webhook]', message);
    return NextResponse.json<WebhookResponse>(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
