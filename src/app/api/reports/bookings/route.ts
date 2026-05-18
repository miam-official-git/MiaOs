import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('bookings')
      .select('booking_type, status, total_price, event_date')
      .is('deleted_at', null)
      .gte('event_date', `${year}-01-01`)
      .lt('event_date', `${year + 1}-01-01`);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const bookings = data ?? [];
    const total = bookings.length;

    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    let totalValue = 0;
    let confirmedValue = 0;

    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] ?? 0) + 1;
      typeCounts[b.booking_type] = (typeCounts[b.booking_type] ?? 0) + 1;
      totalValue += b.total_price;
      if (b.status === 'confirmed' || b.status === 'completed') {
        confirmedValue += b.total_price;
      }
    }

    return Response.json({
      year,
      total,
      statusCounts,
      typeCounts,
      totalValue,
      confirmedValue,
      pipelineValue: totalValue - confirmedValue,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
