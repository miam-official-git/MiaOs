import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const sb = createServiceClient();

    const { data: lesson, error } = await sb
      .from('lessons')
      .select('*, leads!inner(id, contact_id, contacts!inner(full_name, phone))')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      console.error('[api/lessons/[id]] GET', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!lesson) {
      return Response.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return Response.json(lesson);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/lessons/[id]] GET', message);
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
    const sb = createServiceClient();

    const updates: Record<string, unknown> = {};
    if (body.attendance_status !== undefined) updates.attendance_status = body.attendance_status;
    if (body.payment_status !== undefined) updates.payment_status = body.payment_status;
    if (body.payment_amount !== undefined) updates.payment_amount = body.payment_amount;
    if (body.mia_notes !== undefined) updates.mia_notes = body.mia_notes;
    if (body.scheduled_at !== undefined) updates.scheduled_at = body.scheduled_at;
    if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
    if (body.lesson_number !== undefined) updates.lesson_number = body.lesson_number;
    if (body.total_lessons !== undefined) updates.total_lessons = body.total_lessons;

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No update fields provided' }, { status: 400 });
    }

    const { data: lesson, error } = await sb
      .from('lessons')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/lessons/[id]] PATCH', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json(lesson);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/lessons/[id]] PATCH', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
