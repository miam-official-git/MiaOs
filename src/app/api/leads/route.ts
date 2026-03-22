import { type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { upsertContact, createLead, logActivity } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const leadType = searchParams.get('lead_type');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
    const offset = (page - 1) * limit;

    const sb = createServiceClient();

    // Build query — join contacts for name/phone/email
    let query = sb
      .from('leads')
      .select(
        '*, contacts!inner(full_name, phone, email)',
        { count: 'exact' },
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (leadType) {
      query = query.eq('lead_type', leadType);
    }

    if (search) {
      // Search by contact name or phone
      query = query.or(
        `full_name.ilike.%${search}%,phone.ilike.%${search}%`,
        { referencedTable: 'contacts' },
      );
    }

    const { data: leads, count, error } = await query;

    if (error) {
      console.error('[api/leads]', error.message);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({
      leads: leads ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/leads]', message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, phone, email, lead_type, source_platform, metadata, notes } = body;

    if (!full_name || !lead_type) {
      return Response.json({ error: 'full_name and lead_type are required' }, { status: 400 });
    }

    // 1. Upsert contact
    const contact = await upsertContact({
      full_name,
      phone: phone || undefined,
      email: email || undefined,
      manychat_subscriber_id: undefined,
    });

    // 2. Create lead
    const lead = await createLead({
      contact_id: contact.id,
      lead_type,
      source_platform: source_platform || 'other',
      metadata: metadata || {},
    });

    // 3. Log activity
    await logActivity('lead', lead.id, 'created_manually', 'omer', {
      contact_name: full_name,
    });

    return Response.json({ success: true, lead_id: lead.id, status: lead.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[api/leads] POST', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
