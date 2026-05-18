import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    const sb = createServiceClient();
    const { data, error } = await sb
      .from('lessons')
      .select('attendance_status, payment_status, payment_amount, scheduled_at, leads(contacts(full_name))')
      .is('deleted_at', null)
      .gte('scheduled_at', `${year}-01-01`)
      .lt('scheduled_at', `${year + 1}-01-01`);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const lessons = data ?? [];
    const total = lessons.length;
    const attended = lessons.filter((l) => l.attendance_status === 'attended').length;
    const noShow = lessons.filter((l) => l.attendance_status === 'no_show').length;
    const cancelled = lessons.filter((l) => l.attendance_status === 'cancelled').length;
    const paid = lessons.filter((l) => l.payment_status === 'paid').length;
    const totalRevenue = lessons
      .filter((l) => l.payment_status === 'paid')
      .reduce((sum, l) => sum + (l.payment_amount ?? 0), 0);

    const attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;

    // Top students
    const studentCounts: Record<string, number> = {};
    for (const l of lessons) {
      const leadsObj = l.leads as unknown as { contacts?: { full_name?: string } } | null;
      const name = leadsObj?.contacts?.full_name ?? 'unknown';
      if (name) studentCounts[name] = (studentCounts[name] ?? 0) + 1;
    }
    const topStudents = Object.entries(studentCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    return Response.json({
      year,
      total,
      attended,
      noShow,
      cancelled,
      paid,
      totalRevenue,
      attendanceRate,
      topStudents,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
