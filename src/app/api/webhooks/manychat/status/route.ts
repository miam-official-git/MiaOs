import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  updateLeadStatus,
  updateLeadMetadata,
  logActivity,
} from '@/lib/supabase-admin';
import type { LeadStatus } from '@/types/database';

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

interface StatusUpdatePayload {
  subscriber_id: string;
  lead_id?: string;
  action: 'update_status' | 'add_metadata';
  status?: string;
  metadata?: Record<string, unknown>;
}

const VALID_STATUSES: Set<string> = new Set<LeadStatus>([
  'new',
  'contacted',
  'qualified',
  'rejected',
  'converted',
]);

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function validatePayload(body: unknown): {
  valid: boolean;
  data?: StatusUpdatePayload;
  error?: string;
} {
  if (body === null || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.subscriber_id !== 'string' || obj.subscriber_id.trim() === '') {
    return { valid: false, error: 'subscriber_id is required' };
  }

  if (obj.action !== 'update_status' && obj.action !== 'add_metadata') {
    return { valid: false, error: 'action must be "update_status" or "add_metadata"' };
  }

  if (obj.action === 'update_status') {
    if (typeof obj.status !== 'string' || !VALID_STATUSES.has(obj.status)) {
      return {
        valid: false,
        error: `status must be one of: ${[...VALID_STATUSES].join(', ')}`,
      };
    }
  }

  if (obj.action === 'add_metadata') {
    if (obj.metadata === null || typeof obj.metadata !== 'object' || Array.isArray(obj.metadata)) {
      return { valid: false, error: 'metadata must be a JSON object' };
    }
  }

  return { valid: true, data: obj as unknown as StatusUpdatePayload };
}

async function findLatestLeadBySubscriber(subscriberId: string): Promise<string | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('leads')
    .select('id')
    .eq('manychat_subscriber_id', subscriberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to query leads: ${error.message}`);
  return data?.id ?? null;
}

// ------------------------------------------------------------
// Route handler
// ------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Optional: verify webhook secret
    const secret = request.headers.get('x-webhook-secret');
    const expectedSecret = process.env.MANYCHAT_WEBHOOK_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // 2. Parse & validate
    const body: unknown = await request.json();
    const validation = validatePayload(body);
    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 },
      );
    }

    const payload = validation.data;

    // 3. Resolve lead_id
    const leadId = payload.lead_id ?? (await findLatestLeadBySubscriber(payload.subscriber_id));
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: 'No lead found for this subscriber' },
        { status: 404 },
      );
    }

    // 4. Execute action
    if (payload.action === 'update_status' && payload.status) {
      const lead = await updateLeadStatus(leadId, payload.status as LeadStatus);

      await logActivity('lead', leadId, 'status_updated', 'bot', {
        new_status: payload.status,
        subscriber_id: payload.subscriber_id,
      });

      return NextResponse.json({
        success: true,
        lead_id: lead.id,
        status: lead.status,
      });
    }

    if (payload.action === 'add_metadata' && payload.metadata) {
      const lead = await updateLeadMetadata(leadId, payload.metadata);

      await logActivity('lead', leadId, 'metadata_updated', 'bot', {
        added_keys: Object.keys(payload.metadata),
        subscriber_id: payload.subscriber_id,
      });

      return NextResponse.json({
        success: true,
        lead_id: lead.id,
        status: lead.status,
      });
    }

    return NextResponse.json(
      { success: false, error: 'No action performed' },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[manychat/status] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
