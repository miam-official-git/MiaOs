import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    const { data: components, error } = await sb
      .from('booking_components')
      .select('*')
      .eq('booking_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[api/bookings/[id]/components] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ components: components ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/[id]/components] GET', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { component_type, description, cost, is_revenue } = body;

    if (!component_type || cost === undefined || is_revenue === undefined) {
      return Response.json(
        { error: 'component_type, cost, and is_revenue are required' },
        { status: 400 },
      );
    }

    const sb = createServiceClient();

    // Insert component
    const { data: component, error } = await sb
      .from('booking_components')
      .insert({
        booking_id: id,
        component_type,
        description: description ?? null,
        cost,
        is_revenue,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/bookings/[id]/components] POST', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Recalculate total_price
    await recalculateTotalPrice(sb, id);

    return Response.json(component, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/[id]/components] POST', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { component_id } = body;

    if (!component_id) {
      return Response.json({ error: 'component_id is required' }, { status: 400 });
    }

    const sb = createServiceClient();

    const { error } = await sb
      .from('booking_components')
      .delete()
      .eq('id', component_id)
      .eq('booking_id', id);

    if (error) {
      console.error('[api/bookings/[id]/components] DELETE', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    // Recalculate total_price
    await recalculateTotalPrice(sb, id);

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/bookings/[id]/components] DELETE', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function recalculateTotalPrice(
  sb: ReturnType<typeof createServiceClient>,
  bookingId: string,
) {
  // Sum revenue components
  const { data: components } = await sb
    .from('booking_components')
    .select('cost, is_revenue')
    .eq('booking_id', bookingId);

  const totalPrice = (components ?? [])
    .filter((c) => c.is_revenue)
    .reduce((sum, c) => sum + (c.cost ?? 0), 0);

  await sb
    .from('bookings')
    .update({ total_price: totalPrice })
    .eq('id', bookingId);
}
