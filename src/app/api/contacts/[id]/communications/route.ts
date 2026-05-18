import { type NextRequest } from 'next/server';
import { getContactCommunications, logCommunication } from '@/lib/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '30', 10));
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10));

    const result = await getContactCommunications(id, limit, offset);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
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
    const { comm_type, direction, summary, details, logged_by } = body;

    if (!comm_type || !summary?.trim()) {
      return Response.json(
        { error: 'comm_type and summary are required' },
        { status: 400 },
      );
    }

    const log = await logCommunication({
      contact_id: id,
      comm_type,
      direction: direction || null,
      summary: summary.trim(),
      details: details || {},
      logged_by: logged_by || 'omer',
    });

    return Response.json(log, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
