import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const attendanceStatus = searchParams.get('attendance_status');
    const paymentStatus = searchParams.get('payment_status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const sb = createServiceClient();

    let query = sb
      .from('lessons')
      .select(
        '*, leads!inner(id, contact_id, contacts!inner(full_name, phone))',
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (attendanceStatus) {
      query = query.eq('attendance_status', attendanceStatus);
    }

    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus);
    }

    if (dateFrom) {
      query = query.gte('scheduled_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('scheduled_at', dateTo);
    }

    const { data: lessons, count, error } = await query;

    if (error) {
      console.error('[api/lessons]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      lessons: lessons ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/lessons]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sb = createServiceClient();

    const { data: lesson, error } = await sb
      .from('lessons')
      .insert({
        lead_id: body.lead_id,
        lesson_number: body.lesson_number,
        total_lessons: body.total_lessons,
        scheduled_at: body.scheduled_at,
        duration_minutes: body.duration_minutes,
        attendance_status: body.attendance_status ?? 'scheduled',
        payment_status: body.payment_status ?? 'pending',
        payment_amount: body.payment_amount ?? null,
        mia_notes: body.mia_notes ?? null,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/lessons] POST', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(lesson, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/lessons] POST', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
