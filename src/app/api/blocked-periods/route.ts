import { type NextRequest } from 'next/server';
import { getBlockedPeriods, createBlockedPeriod } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date') ?? undefined;
    const endDate = searchParams.get('end_date') ?? undefined;

    const periods = await getBlockedPeriods(startDate, endDate);
    return Response.json({ periods });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, start_date, end_date, reason } = body;

    if (!title?.trim() || !start_date || !end_date) {
      return Response.json(
        { error: 'title, start_date, and end_date are required' },
        { status: 400 },
      );
    }

    const period = await createBlockedPeriod({
      title: title.trim(),
      start_date,
      end_date,
      reason: reason?.trim() || undefined,
    });

    return Response.json(period, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
