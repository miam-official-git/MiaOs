import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { logActivity } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const bookingType = searchParams.get('booking_type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const sb = createServiceClient();

    let query = sb
      .from('bookings')
      .select(
        '*, leads!inner(id, contact_id, contacts!inner(full_name, phone, email))',
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (bookingType) {
      query = query.eq('booking_type', bookingType);
    }

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
      // Last day of month
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      query = query.gte('event_date', startDate).lte('event_date', endDate);
    } else if (year) {
      query = query.gte('event_date', `${year}-01-01`).lte('event_date', `${year}-12-31`);
    }

    const { data: bookings, count, error } = await query;

    if (error) {
      console.error('[api/bookings] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      bookings: bookings ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      lead_id,
      booking_type,
      event_date,
      event_end_date,
      location_city,
      location_address,
      notes,
      components,
    } = body;

    if (!lead_id || !booking_type || !event_date) {
      return Response.json(
        { error: 'lead_id, booking_type, and event_date are required' },
        { status: 400 },
      );
    }

    const sb = createServiceClient();

    // Calculate total_price from revenue components
    const totalPrice = Array.isArray(components)
      ? components
          .filter((c: { is_revenue?: boolean }) => c.is_revenue)
          .reduce((sum: number, c: { cost: number }) => sum + (c.cost ?? 0), 0)
      : 0;

    // Insert booking
    const { data: booking, error: bookingError } = await sb
      .from('bookings')
      .insert({
        lead_id,
        booking_type,
        status: 'new',
        event_date,
        event_end_date: event_end_date ?? null,
        location_city: location_city ?? null,
        location_address: location_address ?? null,
        total_price: totalPrice,
        notes: notes ?? null,
      })
      .select('*')
      .single();

    if (bookingError) {
      console.error('[api/bookings] POST insert', bookingError.message);
      return Response.json({ error: bookingError.message }, { status: 500 });
    }

    // Insert components if provided
    let insertedComponents: unknown[] = [];
    if (Array.isArray(components) && components.length > 0) {
      const rows = components.map(
        (c: { component_type: string; description?: string; cost: number; is_revenue: boolean }) => ({
          booking_id: booking.id,
          component_type: c.component_type,
          description: c.description ?? null,
          cost: c.cost,
          is_revenue: c.is_revenue,
        }),
      );

      const { data: comps, error: compsError } = await sb
        .from('booking_components')
        .insert(rows)
        .select('*');

      if (compsError) {
        console.error('[api/bookings] POST components', compsError.message);
        // Booking was created but components failed — return partial info
        return Response.json({ error: compsError.message }, { status: 500 });
      }

      insertedComponents = comps ?? [];
    }

    // Log activity
    await logActivity('booking', booking.id, 'booking_created', 'system', {
      booking_type,
      event_date,
    });

    return Response.json(
      { ...booking, components: insertedComponents },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings] POST', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
