import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  try {
    const sb = createServiceClient();

    // Fetch expense components (is_revenue = false) with booking context
    const { data: expenses, error } = await sb
      .from('booking_components')
      .select(`
        id,
        booking_id,
        component_type,
        description,
        cost,
        created_at,
        bookings!inner(
          id,
          booking_type,
          event_date,
          event_end_date,
          status,
          location_city,
          leads!inner(
            id,
            contacts!inner(full_name)
          )
        )
      `)
      .eq('is_revenue', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api/finance/suppliers]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Group by booking
    const byBooking = new Map<string, {
      booking_id: string;
      booking_type: string;
      event_date: string;
      status: string;
      location_city: string | null;
      client_name: string;
      components: typeof expenses;
      total_expense: number;
    }>();

    for (const exp of expenses ?? []) {
      const b = exp.bookings as unknown as {
        id: string;
        booking_type: string;
        event_date: string;
        status: string;
        location_city: string | null;
        leads: { id: string; contacts: { full_name: string } };
      };

      if (!byBooking.has(b.id)) {
        byBooking.set(b.id, {
          booking_id: b.id,
          booking_type: b.booking_type,
          event_date: b.event_date,
          status: b.status,
          location_city: b.location_city,
          client_name: b.leads.contacts.full_name,
          components: [],
          total_expense: 0,
        });
      }

      const group = byBooking.get(b.id)!;
      group.components.push(exp);
      group.total_expense += exp.cost;
    }

    const grouped = Array.from(byBooking.values()).sort(
      (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime(),
    );

    const grandTotal = grouped.reduce((sum, g) => sum + g.total_expense, 0);

    return Response.json({
      events: grouped,
      total_expenses: grandTotal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/finance/suppliers]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
