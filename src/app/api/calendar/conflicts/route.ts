import { type NextRequest } from 'next/server';
import { checkCalendarConflicts } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date');
    if (!date) {
      return Response.json({ error: 'date parameter is required' }, { status: 400 });
    }

    const endDate = searchParams.get('end_date') ?? undefined;
    const excludeId = searchParams.get('exclude_id') ?? undefined;

    const result = await checkCalendarConflicts(date, endDate, excludeId);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
