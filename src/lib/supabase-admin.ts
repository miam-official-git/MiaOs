import { createServiceClient } from './supabase';
import type {
  Contact,
  ContactNote,
  CommunicationLog,
  CommunicationType,
  Lead,
  LeadType,
  LeadStatus,
  LeadMetadata,
  SourcePlatform,
  ActorType,
  Message,
  MessageDirection,
  MessageInsert,
  TriageSession,
  TriageSessionStatus,
  BlockedPeriod,
  Reminder,
  ReminderType,
} from '@/types/database';

// ---- Contacts ----

export async function upsertContact(data: {
  full_name: string;
  phone?: string;
  email?: string;
}): Promise<Contact> {
  const sb = createServiceClient();

  // 1. Try to find by phone
  if (data.phone) {
    const { data: existing } = await sb
      .from('contacts')
      .select('*')
      .eq('phone', data.phone)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await sb
        .from('contacts')
        .update({
          full_name: data.full_name,
          ...(data.email && { email: data.email }),
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw new Error(`Failed to update contact: ${error.message}`);
      return updated as Contact;
    }
  }

  // 2. Not found — insert new contact
  const { data: created, error } = await sb
    .from('contacts')
    .insert({
      full_name: data.full_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return created as Contact;
}

// ---- Contacts: WhatsApp / Green API ----

export async function getContactByChatId(
  chatId: string,
): Promise<Contact | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('whatsapp_chat_id', chatId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch contact by chatId: ${error.message}`);
  return (data as Contact) ?? null;
}

export async function upsertContactByWhatsApp(data: {
  chat_id: string;
  phone: string;
  sender_name?: string;
}): Promise<Contact> {
  const sb = createServiceClient();

  // 1. Try to find by whatsapp_chat_id
  const { data: byChatId } = await sb
    .from('contacts')
    .select('*')
    .eq('whatsapp_chat_id', data.chat_id)
    .maybeSingle();

  if (byChatId) {
    if (data.sender_name && data.sender_name !== byChatId.full_name) {
      const { data: updated, error } = await sb
        .from('contacts')
        .update({ full_name: data.sender_name })
        .eq('id', byChatId.id)
        .select('*')
        .single();
      if (error) throw new Error(`Failed to update contact: ${error.message}`);
      return updated as Contact;
    }
    return byChatId as Contact;
  }

  // 2. Try to find by phone
  const { data: byPhone } = await sb
    .from('contacts')
    .select('*')
    .eq('phone', data.phone)
    .maybeSingle();

  if (byPhone) {
    const { data: updated, error } = await sb
      .from('contacts')
      .update({ whatsapp_chat_id: data.chat_id })
      .eq('id', byPhone.id)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update contact: ${error.message}`);
    return updated as Contact;
  }

  // 3. Insert new
  const { data: created, error } = await sb
    .from('contacts')
    .insert({
      full_name: data.sender_name || data.phone,
      phone: data.phone,
      whatsapp_chat_id: data.chat_id,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create WhatsApp contact: ${error.message}`);
  return created as Contact;
}

// ---- Messages ----

export async function saveMessage(data: MessageInsert): Promise<Message> {
  const sb = createServiceClient();

  if (data.greenapi_id_message) {
    const { data: existing } = await sb
      .from('messages')
      .select('*')
      .eq('greenapi_id_message', data.greenapi_id_message)
      .maybeSingle();

    if (existing) return existing as Message;
  }

  const { data: msg, error } = await sb
    .from('messages')
    .insert(data)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to save message: ${error.message}`);
  return msg as Message;
}

export async function getRecentMessages(
  chatId: string,
  limit = 20,
): Promise<Message[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
  return (data ?? []) as Message[];
}

// ---- Triage Sessions ----

export async function getActiveTriageSession(
  chatId: string,
): Promise<TriageSession | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('triage_sessions')
    .select('*')
    .eq('chat_id', chatId)
    .in('status', ['awaiting_language', 'awaiting_name', 'awaiting_response', 'awaiting_date', 'collecting_details'] as TriageSessionStatus[])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch triage session: ${error.message}`);
  return (data as TriageSession) ?? null;
}

export async function createTriageSession(
  chatId: string,
  contactId?: string,
  status: TriageSessionStatus = 'awaiting_response',
): Promise<TriageSession> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('triage_sessions')
    .insert({
      chat_id: chatId,
      contact_id: contactId ?? null,
      status,
      triage_message_sent_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create triage session: ${error.message}`);
  return data as TriageSession;
}

export async function updateTriageSessionStatus(
  sessionId: string,
  status: TriageSessionStatus,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('triage_sessions')
    .update({ status })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update triage session: ${error.message}`);
}

export async function updateTriageSessionLanguage(
  sessionId: string,
  language: string,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('triage_sessions')
    .update({ language })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update triage language: ${error.message}`);
}

export async function updateTriageSessionService(
  sessionId: string,
  service: string,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('triage_sessions')
    .update({ selected_service: service })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update triage service: ${error.message}`);
}

export async function updateTriageSessionDate(
  sessionId: string,
  date: string,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('triage_sessions')
    .update({ requested_date: date })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update triage date: ${error.message}`);
}

export async function updateTriageSessionStep(
  sessionId: string,
  currentStep: number,
  collectedData: Record<string, string>,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('triage_sessions')
    .update({ current_step: currentStep, collected_data: collectedData })
    .eq('id', sessionId);

  if (error) throw new Error(`Failed to update triage step: ${error.message}`);
}

export async function updateContactName(
  contactId: string,
  fullName: string,
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('contacts')
    .update({ full_name: fullName })
    .eq('id', contactId);

  if (error) throw new Error(`Failed to update contact name: ${error.message}`);
}

export async function completeTriageSession(
  sessionId: string,
  leadType: LeadType,
): Promise<TriageSession> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('triage_sessions')
    .update({
      status: 'completed' as TriageSessionStatus,
      selected_lead_type: leadType,
      response_received_at: new Date().toISOString(),
    })
    .eq('id', sessionId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to complete triage session: ${error.message}`);
  return data as TriageSession;
}

export async function pauseTriageForChat(
  chatId: string,
  minutes = 120,
): Promise<void> {
  const sb = createServiceClient();
  const pausedUntil = new Date(Date.now() + minutes * 60_000).toISOString();

  // Pause any active session
  await sb
    .from('triage_sessions')
    .update({
      status: 'paused' as TriageSessionStatus,
      paused_until: pausedUntil,
    })
    .eq('chat_id', chatId)
    .eq('status', 'awaiting_response');

  // Also insert a paused marker if no session existed
  const { data: existing } = await sb
    .from('triage_sessions')
    .select('id')
    .eq('chat_id', chatId)
    .in('status', ['paused'])
    .gte('paused_until', new Date().toISOString())
    .maybeSingle();

  if (!existing) {
    await sb.from('triage_sessions').insert({
      chat_id: chatId,
      status: 'paused' as TriageSessionStatus,
      paused_until: pausedUntil,
    });
  }
}

export async function isTriagePaused(chatId: string): Promise<boolean> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('triage_sessions')
    .select('id')
    .eq('chat_id', chatId)
    .eq('status', 'paused')
    .gte('paused_until', new Date().toISOString())
    .maybeSingle();

  return !!data;
}

export async function contactHasLeads(contactId: string): Promise<boolean> {
  const sb = createServiceClient();
  const { count } = await sb
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('contact_id', contactId)
    .is('deleted_at', null);

  return (count ?? 0) > 0;
}

export async function isNewWhatsAppContact(contactId: string): Promise<boolean> {
  const sb = createServiceClient();

  const [{ count: leads }, { count: sessions }, { count: outbound }] = await Promise.all([
    sb.from('leads').select('id', { count: 'exact', head: true }).eq('contact_id', contactId),
    sb.from('triage_sessions').select('id', { count: 'exact', head: true }).eq('contact_id', contactId).eq('status', 'completed'),
    sb.from('messages').select('id', { count: 'exact', head: true }).eq('contact_id', contactId).eq('direction', 'outbound'),
  ]);

  return (leads ?? 0) === 0 && (sessions ?? 0) === 0 && (outbound ?? 0) === 0;
}

// ---- Leads ----

export async function createLead(data: {
  contact_id: string;
  lead_type: LeadType;
  source_platform: SourcePlatform;
  metadata: LeadMetadata;
}): Promise<Lead> {
  const sb = createServiceClient();
  const { data: lead, error } = await sb
    .from('leads')
    .insert({
      contact_id: data.contact_id,
      lead_type: data.lead_type,
      status: 'new' as LeadStatus,
      source_platform: data.source_platform,
      metadata: data.metadata,
      rejection_reason: null,
      ai_summary: null,
      assigned_to: null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create lead: ${error.message}`);
  return lead as Lead;
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch lead: ${error.message}`);
  return (data as Lead) ?? null;
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
  rejectionReason?: string
): Promise<Lead> {
  const sb = createServiceClient();
  const { data: lead, error } = await sb
    .from('leads')
    .update({
      status,
      ...(rejectionReason !== undefined && { rejection_reason: rejectionReason }),
    })
    .eq('id', leadId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update lead status: ${error.message}`);
  return lead as Lead;
}

export async function updateLeadMetadata(
  leadId: string,
  metadata: Record<string, unknown>
): Promise<Lead> {
  const sb = createServiceClient();

  // Fetch current lead to merge metadata
  const existing = await getLeadById(leadId);
  if (!existing) throw new Error(`Lead not found: ${leadId}`);

  const merged = { ...(existing.metadata as Record<string, unknown>), ...metadata };

  const { data: lead, error } = await sb
    .from('leads')
    .update({ metadata: merged })
    .eq('id', leadId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update lead metadata: ${error.message}`);
  return lead as Lead;
}

export async function getLatestLeadForContact(contactId: string): Promise<Lead | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch latest lead: ${error.message}`);
  return (data as Lead) ?? null;
}

export async function appendLeadNotes(leadId: string, text: string): Promise<void> {
  const sb = createServiceClient();
  const { data: lead } = await sb
    .from('leads')
    .select('notes')
    .eq('id', leadId)
    .single();

  const existing = (lead?.notes as string) ?? '';
  const updated = existing ? `${existing}\n${text}` : text;

  const { error } = await sb
    .from('leads')
    .update({ notes: updated })
    .eq('id', leadId);

  if (error) throw new Error(`Failed to append lead notes: ${error.message}`);
}

export async function archiveLead(leadId: string): Promise<Lead> {
  const sb = createServiceClient();
  const { data: lead, error } = await sb
    .from('leads')
    .update({ status: 'archived' as LeadStatus })
    .eq('id', leadId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to archive lead: ${error.message}`);
  return lead as Lead;
}

export async function softDeleteLead(leadId: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', leadId);

  if (error) throw new Error(`Failed to delete lead: ${error.message}`);
}

// ---- Activity Log ----

export async function logActivity(
  entityType: string,
  entityId: string,
  action: string,
  actor: ActorType,
  details?: Record<string, unknown>
): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb.from('activity_log').insert({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor,
    details: details ?? {},
  });

  if (error) throw new Error(`Failed to log activity: ${error.message}`);
}

// ---- Contact Detail Helpers ----

export async function getContactById(contactId: string): Promise<Contact | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch contact: ${error.message}`);
  return (data as Contact) ?? null;
}

export async function updateContact(
  contactId: string,
  updates: Partial<Pick<Contact, 'full_name' | 'phone' | 'email' | 'notes'>>
): Promise<Contact> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  return data as Contact;
}

export async function getContactLeads(contactId: string): Promise<Lead[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('leads')
    .select('*')
    .eq('contact_id', contactId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch contact leads: ${error.message}`);
  return (data ?? []) as Lead[];
}

export async function getContactBookings(contactId: string) {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('bookings')
    .select('*, leads!inner(contact_id)')
    .eq('leads.contact_id', contactId)
    .is('deleted_at', null)
    .order('event_date', { ascending: false });

  if (error) throw new Error(`Failed to fetch contact bookings: ${error.message}`);
  return data ?? [];
}

export async function getContactLessons(contactId: string) {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('lessons')
    .select('*, leads!inner(contact_id)')
    .eq('leads.contact_id', contactId)
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch contact lessons: ${error.message}`);
  return data ?? [];
}

export async function getContactPayments(contactId: string) {
  const sb = createServiceClient();

  // Get payments via bookings
  const { data: bookingPayments, error: bErr } = await sb
    .from('finance_transactions')
    .select('*, bookings!inner(lead_id, leads!inner(contact_id))')
    .eq('bookings.leads.contact_id', contactId)
    .order('created_at', { ascending: false });

  // Get payments via lessons
  const { data: lessonPayments, error: lErr } = await sb
    .from('finance_transactions')
    .select('*, lessons!inner(lead_id, leads!inner(contact_id))')
    .eq('lessons.leads.contact_id', contactId)
    .order('created_at', { ascending: false });

  if (bErr) throw new Error(`Failed to fetch booking payments: ${bErr.message}`);
  if (lErr) throw new Error(`Failed to fetch lesson payments: ${lErr.message}`);

  const seen = new Set<string>();
  const all = [...(bookingPayments ?? []), ...(lessonPayments ?? [])].filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return all;
}

export async function getContactNotes(contactId: string): Promise<ContactNote[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('contact_notes')
    .select('*')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch contact notes: ${error.message}`);
  return (data ?? []) as ContactNote[];
}

export async function createContactNote(
  contactId: string,
  content: string,
  author: ActorType = 'omer'
): Promise<ContactNote> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('contact_notes')
    .insert({ contact_id: contactId, content, author })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create contact note: ${error.message}`);
  return data as ContactNote;
}

export async function getContactActivity(contactId: string) {
  const sb = createServiceClient();

  // Get all lead IDs for this contact
  const { data: leads } = await sb
    .from('leads')
    .select('id')
    .eq('contact_id', contactId);

  const leadIds = (leads ?? []).map(l => l.id);
  if (leadIds.length === 0) return [];

  const { data, error } = await sb
    .from('activity_log')
    .select('*')
    .in('entity_id', leadIds)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(`Failed to fetch contact activity: ${error.message}`);
  return data ?? [];
}

// ---- Communication History ----

export interface UnifiedComm {
  id: string;
  source: 'whatsapp' | 'manual';
  type: string;
  direction: string | null;
  content: string;
  author: string;
  created_at: string;
}

export async function getContactCommunications(
  contactId: string,
  limit = 30,
  offset = 0,
): Promise<{ items: UnifiedComm[]; total: number }> {
  const sb = createServiceClient();

  const contact = await getContactById(contactId);
  if (!contact) return { items: [], total: 0 };

  // 1. WhatsApp messages (via chat_id)
  let waMessages: UnifiedComm[] = [];
  let waCount = 0;
  if (contact.whatsapp_chat_id) {
    const { data: msgs, count } = await sb
      .from('messages')
      .select('*', { count: 'exact' })
      .eq('chat_id', contact.whatsapp_chat_id)
      .order('created_at', { ascending: false });

    waCount = count ?? 0;
    waMessages = (msgs ?? []).map((m) => ({
      id: m.id,
      source: 'whatsapp' as const,
      type: 'whatsapp',
      direction: m.direction,
      content: m.content ?? '',
      author: m.direction === 'inbound' ? (m.sender_name ?? 'לקוח') : 'בוט',
      created_at: m.created_at,
    }));
  }

  // 2. Manual communication log
  const { data: manualLogs, count: manualCount } = await sb
    .from('communication_log')
    .select('*', { count: 'exact' })
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false });

  const manualItems: UnifiedComm[] = (manualLogs ?? []).map((c) => ({
    id: c.id,
    source: 'manual' as const,
    type: c.comm_type,
    direction: c.direction,
    content: c.summary,
    author: c.logged_by === 'omer' ? 'עומר' : c.logged_by === 'mia' ? 'מייה' : c.logged_by,
    created_at: c.created_at,
  }));

  // 3. Merge and sort
  const all = [...waMessages, ...manualItems].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const total = waCount + (manualCount ?? 0);
  const items = all.slice(offset, offset + limit);

  return { items, total };
}

export async function logCommunication(data: {
  contact_id: string;
  comm_type: CommunicationType;
  direction?: MessageDirection | null;
  summary: string;
  details?: Record<string, unknown>;
  logged_by?: ActorType;
}): Promise<CommunicationLog> {
  const sb = createServiceClient();
  const { data: log, error } = await sb
    .from('communication_log')
    .insert({
      contact_id: data.contact_id,
      comm_type: data.comm_type,
      direction: data.direction ?? null,
      summary: data.summary,
      details: data.details ?? {},
      logged_by: data.logged_by ?? 'omer',
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to log communication: ${error.message}`);
  return log as CommunicationLog;
}

// ---- Calendar: Unified Events ----

export interface CalendarEvent {
  id: string;
  type: 'booking' | 'lesson' | 'blocked';
  title: string;
  date: string;
  endDate?: string;
  startTime: string | null;
  endTime: string | null;
  contactName?: string;
  status?: string;
  bookingType?: string;
}

export async function getCalendarEvents(
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  const sb = createServiceClient();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

  // 1. Bookings
  const { data: bookings } = await sb
    .from('bookings')
    .select('id, booking_type, status, event_date, event_end_date, event_start_time, event_end_time, leads(contacts(full_name))')
    .is('deleted_at', null)
    .gte('event_date', startDate)
    .lt('event_date', endDate);

  const bookingEvents: CalendarEvent[] = (bookings ?? []).map((b: Record<string, unknown>) => ({
    id: b.id as string,
    type: 'booking' as const,
    title: (b as Record<string, unknown>).booking_type === 'vocal_lesson' ? 'שיעור' :
           (b as Record<string, unknown>).booking_type === 'chuppah' ? 'חופה' :
           (b as Record<string, unknown>).booking_type === 'private_event' ? 'אירוע' :
           (b as Record<string, unknown>).booking_type === 'modeling' ? 'דוגמנות' : 'אחר',
    date: b.event_date as string,
    endDate: (b.event_end_date as string) ?? undefined,
    startTime: (b.event_start_time as string) ?? null,
    endTime: (b.event_end_time as string) ?? null,
    contactName: ((b.leads as Record<string, unknown>)?.contacts as Record<string, unknown>)?.full_name as string ?? '',
    status: b.status as string,
    bookingType: b.booking_type as string,
  }));

  // 2. Lessons
  const { data: lessons } = await sb
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, attendance_status, leads(contacts(full_name))')
    .is('deleted_at', null)
    .gte('scheduled_at', startDate)
    .lt('scheduled_at', endDate);

  const lessonEvents: CalendarEvent[] = (lessons ?? []).map((l: Record<string, unknown>) => {
    const scheduledAt = new Date(l.scheduled_at as string);
    const endAt = new Date(scheduledAt.getTime() + (l.duration_minutes as number) * 60000);
    return {
      id: l.id as string,
      type: 'lesson' as const,
      title: 'שיעור קול',
      date: (l.scheduled_at as string).slice(0, 10),
      startTime: `${String(scheduledAt.getHours()).padStart(2, '0')}:${String(scheduledAt.getMinutes()).padStart(2, '0')}`,
      endTime: `${String(endAt.getHours()).padStart(2, '0')}:${String(endAt.getMinutes()).padStart(2, '0')}`,
      contactName: ((l.leads as Record<string, unknown>)?.contacts as Record<string, unknown>)?.full_name as string ?? '',
      status: l.attendance_status as string,
    };
  });

  // 3. Blocked periods (overlap with month range)
  const { data: blocked } = await sb
    .from('blocked_periods')
    .select('*')
    .lte('start_date', endDate)
    .gte('end_date', startDate);

  const blockedEvents: CalendarEvent[] = (blocked ?? []).map((bp: Record<string, unknown>) => ({
    id: bp.id as string,
    type: 'blocked' as const,
    title: bp.title as string,
    date: bp.start_date as string,
    endDate: bp.end_date as string,
    startTime: null,
    endTime: null,
  }));

  return [...bookingEvents, ...lessonEvents, ...blockedEvents];
}

// ---- Blocked Periods ----

export async function getBlockedPeriods(
  startDate?: string,
  endDate?: string,
): Promise<BlockedPeriod[]> {
  const sb = createServiceClient();
  let query = sb.from('blocked_periods').select('*').order('start_date', { ascending: true });

  if (startDate) query = query.gte('end_date', startDate);
  if (endDate) query = query.lte('start_date', endDate);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch blocked periods: ${error.message}`);
  return (data ?? []) as BlockedPeriod[];
}

export async function createBlockedPeriod(data: {
  title: string;
  start_date: string;
  end_date: string;
  reason?: string;
}): Promise<BlockedPeriod> {
  const sb = createServiceClient();
  const { data: bp, error } = await sb
    .from('blocked_periods')
    .insert({
      title: data.title,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create blocked period: ${error.message}`);
  return bp as BlockedPeriod;
}

export async function deleteBlockedPeriod(id: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb.from('blocked_periods').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete blocked period: ${error.message}`);
}

// ---- Calendar Conflict Check ----

export async function checkCalendarConflicts(
  date: string,
  endDate?: string,
  excludeBookingId?: string,
): Promise<{
  bookings: Array<{ id: string; booking_type: string; status: string; event_date: string; event_start_time: string | null; event_end_time: string | null; contact_name: string }>;
  lessons: Array<{ id: string; scheduled_at: string; duration_minutes: number; contact_name: string }>;
  blockedPeriods: BlockedPeriod[];
}> {
  const sb = createServiceClient();
  const checkDate = date.slice(0, 10);
  const checkEndDate = endDate?.slice(0, 10) ?? checkDate;

  // Bookings on these dates
  let bQuery = sb
    .from('bookings')
    .select('id, booking_type, status, event_date, event_start_time, event_end_time, leads(contacts(full_name))')
    .is('deleted_at', null)
    .lte('event_date', checkEndDate + 'T23:59:59')
    .gte('event_date', checkDate + 'T00:00:00');

  if (excludeBookingId) bQuery = bQuery.neq('id', excludeBookingId);
  const { data: bookingData } = await bQuery;

  const bookings = (bookingData ?? []).map((b: Record<string, unknown>) => ({
    id: b.id as string,
    booking_type: b.booking_type as string,
    status: b.status as string,
    event_date: b.event_date as string,
    event_start_time: (b.event_start_time as string) ?? null,
    event_end_time: (b.event_end_time as string) ?? null,
    contact_name: ((b.leads as Record<string, unknown>)?.contacts as Record<string, unknown>)?.full_name as string ?? '',
  }));

  // Lessons on these dates
  const { data: lessonData } = await sb
    .from('lessons')
    .select('id, scheduled_at, duration_minutes, leads(contacts(full_name))')
    .is('deleted_at', null)
    .gte('scheduled_at', checkDate + 'T00:00:00')
    .lte('scheduled_at', checkEndDate + 'T23:59:59');

  const lessons = (lessonData ?? []).map((l: Record<string, unknown>) => ({
    id: l.id as string,
    scheduled_at: l.scheduled_at as string,
    duration_minutes: l.duration_minutes as number,
    contact_name: ((l.leads as Record<string, unknown>)?.contacts as Record<string, unknown>)?.full_name as string ?? '',
  }));

  // Blocked periods overlapping
  const { data: blockedData } = await sb
    .from('blocked_periods')
    .select('*')
    .lte('start_date', checkEndDate)
    .gte('end_date', checkDate);

  return {
    bookings,
    lessons,
    blockedPeriods: (blockedData ?? []) as BlockedPeriod[],
  };
}

// ---- Reminders ----

export async function createReminder(data: {
  contact_id?: string;
  booking_id?: string;
  lesson_id?: string;
  reminder_type: ReminderType;
  scheduled_for: string;
  message_text?: string;
}): Promise<Reminder> {
  const sb = createServiceClient();
  const { data: reminder, error } = await sb
    .from('reminders')
    .insert({
      contact_id: data.contact_id ?? null,
      booking_id: data.booking_id ?? null,
      lesson_id: data.lesson_id ?? null,
      reminder_type: data.reminder_type,
      scheduled_for: data.scheduled_for,
      message_text: data.message_text ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create reminder: ${error.message}`);
  return reminder as Reminder;
}

export async function getPendingReminders(): Promise<Reminder[]> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('reminders')
    .select('*')
    .is('sent_at', null)
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error) throw new Error(`Failed to fetch pending reminders: ${error.message}`);
  return (data ?? []) as Reminder[];
}

export async function markReminderSent(id: string): Promise<void> {
  const sb = createServiceClient();
  const { error } = await sb
    .from('reminders')
    .update({ sent_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(`Failed to mark reminder sent: ${error.message}`);
}
