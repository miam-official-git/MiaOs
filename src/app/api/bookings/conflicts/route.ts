import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const endDate = searchParams.get('end_date');
    const excludeId = searchParams.get('exclude_id');

    if (!date) {
      return Response.json({ error: 'date parameter is required' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { data: conflicts, error } = await sb.rpc('detect_booking_conflicts', {
      p_start: date,
      p_end: endDate ?? date,
      p_exclude_booking_id: excludeId ?? undefined,
    });

    if (error) {
      console.error('[api/bookings/conflicts] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ conflicts: conflicts ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/conflicts] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
