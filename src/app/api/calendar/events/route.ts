import { type NextRequest } from 'next/server';
import { getCalendarEvents } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const now = new Date();
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10);

    const events = await getCalendarEvents(year, month);
    return Response.json({ events });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
