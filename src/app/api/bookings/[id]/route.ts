import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logActivity } from '@/lib/supabase-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    // Fetch booking with components and lead+contact info
    const { data: booking, error } = await sb
      .from('bookings')
      .select(
        '*, booking_components(*), leads!inner(id, contact_id, lead_type, status, contacts!inner(full_name, phone, email))',
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) {
      console.error('[api/bookings/[id]] GET', error.message);
      const status = error.code === 'PGRST116' ? 404 : 500;
      return Response.json({ error: error.message }, { status });
    }

    // Fetch activity log for this booking
    const { data: activity } = await sb
      .from('activity_log')
      .select('*')
      .eq('entity_type', 'booking')
      .eq('entity_id', id)
      .order('created_at', { ascending: false });

    return Response.json({ ...booking, activity: activity ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/[id]] GET', message);
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

    const allowedFields = [
      'status',
      'event_date',
      'event_end_date',
      'location_city',
      'location_address',
      'notes',
      'quote_sent_at',
      'quote_signed_at',
      'quote_url',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const sb = createServiceClient();

    // Check if this is a status change for activity logging
    const oldStatus = body.status !== undefined
      ? (await sb.from('bookings').select('status').eq('id', id).single()).data?.status
      : null;

    const { data: booking, error } = await sb
      .from('bookings')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error) {
      console.error('[api/bookings/[id]] PATCH', error.message);
      const status = error.code === 'PGRST116' ? 404 : 500;
      return Response.json({ error: error.message }, { status });
    }

    // Log activity on status change
    if (body.status && oldStatus && body.status !== oldStatus) {
      await logActivity('booking', id, 'status_changed', 'system', {
        from: oldStatus,
        to: body.status,
      });
    }

    return Response.json(booking);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/[id]] PATCH', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    const { data: booking, error } = await sb
      .from('bookings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (error) {
      console.error('[api/bookings/[id]] DELETE', error.message);
      const status = error.code === 'PGRST116' ? 404 : 500;
      return Response.json({ error: error.message }, { status });
    }

    await logActivity('booking', booking.id, 'booking_deleted', 'system');

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/[id]] DELETE', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
