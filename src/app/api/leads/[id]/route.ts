import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { updateLeadStatus, updateLeadMetadata, archiveLead, softDeleteLead, logActivity } from '@/lib/supabase-admin';
import type { LeadStatus } from '@/types/database';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    // Fetch lead with contact info
    const { data: lead, error: leadError } = await sb
      .from('leads')
      .select('*, contacts!inner(full_name, phone, email)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (leadError) {
      console.error('[api/leads/[id]] GET', leadError.message);
      return Response.json({ error: leadError.message }, { status: 500 });
    }

    if (!lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch activity log for this lead
    const { data: activity, error: activityError } = await sb
      .from('activity_log')
      .select('*')
      .eq('entity_type', 'lead')
      .eq('entity_id', id)
      .order('created_at', { ascending: false });

    if (activityError) {
      console.error('[api/leads/[id]] activity', activityError.message);
    }

    return Response.json({
      ...lead,
      activity_log: activity ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/leads/[id]] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();

    let lead;

    // Update status if provided
    if (body.status) {
      lead = await updateLeadStatus(
        id,
        body.status as LeadStatus,
        body.rejection_reason,
      );
    }

    // Update metadata if provided
    if (body.metadata) {
      lead = await updateLeadMetadata(id, body.metadata);
    }

    // Update notes if provided (standalone or alongside other updates)
    if (body.notes !== undefined) {
      const sb = createServiceClient();
      const { data: updated, error } = await sb
        .from('leads')
        .update({ notes: body.notes })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw new Error(`Failed to update notes: ${error.message}`);
      lead = updated;
    }

    if (!lead) {
      return Response.json(
        { error: 'No update fields provided' },
        { status: 400 },
      );
    }

    return Response.json(lead);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/leads/[id]] PATCH', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action') ?? 'delete';

    if (action === 'archive') {
      const lead = await archiveLead(id);
      await logActivity('lead', id, 'archived', 'omer', {});
      return Response.json({ success: true, lead });
    }

    // Soft delete
    await softDeleteLead(id);
    await logActivity('lead', id, 'deleted', 'omer', {});
    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/leads/[id]] DELETE', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
