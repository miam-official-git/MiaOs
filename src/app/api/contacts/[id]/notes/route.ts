import { type NextRequest } from 'next/server';
import { getContactNotes, createContactNote } from '@/lib/supabase-admin';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const notes = await getContactNotes(id);
    return Response.json(notes);
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
    const { content, author } = body;

    if (!content?.trim()) {
      return Response.json({ error: 'content is required' }, { status: 400 });
    }

    const note = await createContactNote(id, content.trim(), author || 'omer');
    return Response.json(note, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
