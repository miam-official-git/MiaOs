import { createServiceClient } from './supabase';
import { logActivity } from './supabase-admin';
import type { AutomationRule } from '@/types/database';

interface AutomationResult {
  rule: string;
  triggered: number;
  actions: string[];
}

export async function runAutomationRules(): Promise<AutomationResult[]> {
  const sb = createServiceClient();
  const results: AutomationResult[] = [];

  // Fetch active rules
  const { data: rules, error } = await sb
    .from('automation_rules')
    .select('*')
    .eq('is_active', true);

  if (error || !rules) return results;

  for (const rule of rules as AutomationRule[]) {
    const result = await processRule(rule);
    if (result.triggered > 0) {
      results.push(result);
    }
  }

  return results;
}

async function processRule(rule: AutomationRule): Promise<AutomationResult> {
  const result: AutomationResult = { rule: rule.name, triggered: 0, actions: [] };

  switch (rule.trigger_type) {
    case 'lead_stale':
      return processLeadStale(rule, result);
    case 'quote_unsigned':
      return processQuoteUnsigned(rule, result);
    case 'payment_overdue':
      return processPaymentOverdue(rule, result);
    case 'post_event':
      return processPostEvent(rule, result);
    default:
      return result;
  }
}

async function processLeadStale(
  rule: AutomationRule,
  result: AutomationResult,
): Promise<AutomationResult> {
  const sb = createServiceClient();
  const cutoff = new Date(Date.now() - rule.delay_hours * 3600000).toISOString();

  const { data: staleLeads } = await sb
    .from('leads')
    .select('id, contact_id')
    .eq('status', 'new')
    .is('deleted_at', null)
    .lt('created_at', cutoff);

  for (const lead of staleLeads ?? []) {
    // Check if follow-up already exists
    const { data: existing } = await sb
      .from('follow_ups')
      .select('id')
      .eq('lead_id', lead.id)
      .eq('type', 'general')
      .is('completed_at', null)
      .maybeSingle();

    if (existing) continue;

    await sb.from('follow_ups').insert({
      lead_id: lead.id,
      type: 'general',
      scheduled_for: new Date().toISOString(),
      notes: `אוטומטי: ליד לא טופל ${rule.delay_hours} שעות`,
    });

    await logActivity('lead', lead.id, 'automation_followup_created', 'system', {
      rule: rule.name,
      reason: 'lead_stale',
    });

    result.triggered++;
    result.actions.push(`Follow-up created for lead ${lead.id}`);
  }

  return result;
}

async function processQuoteUnsigned(
  rule: AutomationRule,
  result: AutomationResult,
): Promise<AutomationResult> {
  const sb = createServiceClient();
  const cutoff = new Date(Date.now() - rule.delay_hours * 3600000).toISOString();

  const { data: unsignedBookings } = await sb
    .from('bookings')
    .select('id, lead_id')
    .is('deleted_at', null)
    .not('quote_sent_at', 'is', null)
    .is('quote_signed_at', null)
    .lt('quote_sent_at', cutoff)
    .in('status', ['new', 'option']);

  for (const booking of unsignedBookings ?? []) {
    const { data: existing } = await sb
      .from('follow_ups')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('type', 'quote_reminder')
      .is('completed_at', null)
      .maybeSingle();

    if (existing) continue;

    await sb.from('follow_ups').insert({
      lead_id: booking.lead_id,
      booking_id: booking.id,
      type: 'quote_reminder',
      scheduled_for: new Date().toISOString(),
      notes: `אוטומטי: הצעת מחיר לא נחתמה ${rule.delay_hours} שעות`,
    });

    await logActivity('booking', booking.id, 'automation_quote_reminder', 'system', {
      rule: rule.name,
    });

    result.triggered++;
    result.actions.push(`Quote reminder for booking ${booking.id}`);
  }

  return result;
}

async function processPaymentOverdue(
  rule: AutomationRule,
  result: AutomationResult,
): Promise<AutomationResult> {
  const sb = createServiceClient();
  const now = new Date().toISOString();

  const { data: overdue } = await sb
    .from('finance_transactions')
    .select('id, booking_id, lesson_id')
    .eq('status', 'pending')
    .not('due_date', 'is', null)
    .lt('due_date', now);

  for (const tx of overdue ?? []) {
    const entityType = tx.booking_id ? 'booking' : 'lesson';
    const entityId = tx.booking_id ?? tx.lesson_id;
    if (!entityId) continue;

    const { data: existing } = await sb
      .from('follow_ups')
      .select('id')
      .eq(tx.booking_id ? 'booking_id' : 'lead_id', entityId)
      .eq('type', 'payment_reminder')
      .is('completed_at', null)
      .maybeSingle();

    if (existing) continue;

    await sb.from('follow_ups').insert({
      booking_id: tx.booking_id,
      type: 'payment_reminder',
      scheduled_for: new Date().toISOString(),
      notes: `אוטומטי: תשלום באיחור — עסקה ${tx.id}`,
    });

    await logActivity(entityType, entityId, 'automation_payment_reminder', 'system', {
      rule: rule.name,
      transaction_id: tx.id,
    });

    result.triggered++;
    result.actions.push(`Payment reminder for transaction ${tx.id}`);
  }

  return result;
}

async function processPostEvent(
  rule: AutomationRule,
  result: AutomationResult,
): Promise<AutomationResult> {
  const sb = createServiceClient();
  const now = new Date();
  const cutoff = new Date(now.getTime() - rule.delay_hours * 3600000);
  const dayAgo = new Date(now.getTime() - (rule.delay_hours + 24) * 3600000);

  const { data: recentBookings } = await sb
    .from('bookings')
    .select('id, lead_id')
    .is('deleted_at', null)
    .eq('status', 'completed')
    .gte('event_date', dayAgo.toISOString())
    .lte('event_date', cutoff.toISOString());

  for (const booking of recentBookings ?? []) {
    const { data: existing } = await sb
      .from('follow_ups')
      .select('id')
      .eq('booking_id', booking.id)
      .eq('type', 'general')
      .is('completed_at', null)
      .maybeSingle();

    if (existing) continue;

    await sb.from('follow_ups').insert({
      lead_id: booking.lead_id,
      booking_id: booking.id,
      type: 'general',
      scheduled_for: new Date().toISOString(),
      notes: 'אוטומטי: הודעת תודה/פידבק אחרי אירוע',
    });

    await logActivity('booking', booking.id, 'automation_post_event', 'system', {
      rule: rule.name,
    });

    result.triggered++;
    result.actions.push(`Post-event follow-up for booking ${booking.id}`);
  }

  return result;
}
