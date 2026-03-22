import { createServiceClient } from './supabase';
import type {
  Contact,
  Lead,
  LeadType,
  LeadStatus,
  LeadMetadata,
  SourcePlatform,
  ActorType,
} from '@/types/database';

// ---- Contacts ----

export async function upsertContact(data: {
  full_name: string;
  phone?: string;
  email?: string;
  manychat_subscriber_id?: string;
}): Promise<Contact> {
  const sb = createServiceClient();

  // 1. Try to find by manychat_subscriber_id
  if (data.manychat_subscriber_id) {
    const { data: existing } = await sb
      .from('contacts')
      .select('*')
      .eq('manychat_subscriber_id', data.manychat_subscriber_id)
      .maybeSingle();

    if (existing) {
      const { data: updated, error } = await sb
        .from('contacts')
        .update({
          full_name: data.full_name,
          ...(data.phone && { phone: data.phone }),
          ...(data.email && { email: data.email }),
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw new Error(`Failed to update contact: ${error.message}`);
      return updated as Contact;
    }
  }

  // 2. Try to find by phone
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
          ...(data.manychat_subscriber_id && {
            manychat_subscriber_id: data.manychat_subscriber_id,
          }),
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throw new Error(`Failed to update contact: ${error.message}`);
      return updated as Contact;
    }
  }

  // 3. Not found — insert new contact
  const { data: created, error } = await sb
    .from('contacts')
    .insert({
      full_name: data.full_name,
      phone: data.phone ?? null,
      email: data.email ?? null,
      manychat_subscriber_id: data.manychat_subscriber_id ?? null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create contact: ${error.message}`);
  return created as Contact;
}

export async function getContactByManychatId(
  subscriberId: string
): Promise<Contact | null> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from('contacts')
    .select('*')
    .eq('manychat_subscriber_id', subscriberId)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch contact: ${error.message}`);
  return (data as Contact) ?? null;
}

// ---- Leads ----

export async function createLead(data: {
  contact_id: string;
  lead_type: LeadType;
  source_platform: SourcePlatform;
  manychat_subscriber_id?: string;
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
      manychat_subscriber_id: data.manychat_subscriber_id ?? null,
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
