/**
 * Import leads from the business template Excel file into Supabase.
 *
 * Usage:
 *   npx tsx scripts/import-leads.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// ---------- Config ----------

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

// ---------- Mapping helpers ----------

function mapLeadType(raw: string): string {
  const s = raw?.trim().toLowerCase() ?? '';
  if (s.includes('חופה')) return 'chuppah';
  if (s.includes('פיתוח קול') || s.includes('פיטנס קולי')) return 'vocal_lesson';
  if (s.includes('אירוע פרטי') || s.includes('בת מצווה') || s.includes('בר מצווה')) return 'private_event';
  if (s.includes('דוגמנות') || s.includes('modeling')) return 'modeling';
  if (s.includes('הצעת נישואין')) return 'private_event';
  return 'other';
}

function mapStatus(raw: string, rawAdvanced: string): string {
  const s = raw?.trim() ?? '';
  const adv = rawAdvanced?.trim() ?? '';
  if (s === 'לא רלוונטי' || adv === 'לא רלוונטי') return 'rejected';
  if (s === 'סגור') return 'lost';
  if (adv === 'נשלחה הצעת מחיר') return 'quoted';
  if (adv.includes('מחכה')) return 'contacted';
  if (s === 'בתהליך') return 'contacted';
  return 'new';
}

function mapSource(raw: string): string {
  const s = raw?.trim().toLowerCase() ?? '';
  if (s.includes('אינסטגרם') || s.includes('instagram')) return 'instagram';
  if (s.includes('טיקטוק') || s.includes('tiktok')) return 'tiktok';
  if (s.includes('וואטסאפ') || s.includes('whatsapp')) return 'whatsapp';
  if (s.includes('פייסבוק') || s.includes('facebook')) return 'website';
  if (s.includes('המלצ') || s.includes('שיחה') || s.includes('לקוח חוזר')) return 'referral';
  if (s.includes('יוטיוב') || s.includes('youtube')) return 'website';
  return 'other';
}

function parsePhone(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // If it's a social handle (no digits or just a username), return null
  if (!/\d/.test(s)) return null;
  return s;
}

function parseDate(raw: string | number): string | null {
  if (!raw) return null;

  // Excel serial number
  if (typeof raw === 'number') {
    const d = new Date((raw - 25569) * 86400 * 1000);
    return d.toISOString();
  }

  const s = String(raw).trim();
  if (!s) return null;

  // Try DD/MM/YYYY
  const ddmm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (ddmm) {
    let year = parseInt(ddmm[3], 10);
    if (year < 100) year += 2000;
    const month = parseInt(ddmm[2], 10);
    const day = parseInt(ddmm[1], 10);
    return new Date(year, month - 1, day).toISOString();
  }

  // Try M/D/YY or M/DD/YY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (mdy) {
    const year = 2000 + parseInt(mdy[3], 10);
    const month = parseInt(mdy[1], 10);
    const day = parseInt(mdy[2], 10);
    return new Date(year, month - 1, day).toISOString();
  }

  // Fallback
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function parseAmount(raw: string): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/[₪€$,\s]/g, '').replace('יורו', '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

// ---------- Main ----------

async function main() {
  const filePath = path.join(__dirname, 'טאמפלט עסקי.xlsx');
  console.log(`Reading ${filePath}...`);

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });

  console.log(`Found ${rows.length} rows`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const fullName = (row['שם מלא'] ?? '').trim();
    if (!fullName || fullName === 'לא ברור') {
      skipped++;
      continue;
    }

    const phone = parsePhone(row['פרטי תקשורת'] ?? '');
    const leadType = mapLeadType(row['סוג האירוע/פנייה'] ?? '');
    const status = mapStatus(row['סטטוס'] ?? '', row['סטטוס מתקדם'] ?? '');
    const sourcePlatform = mapSource(row['מאיפה הליד הגיע'] ?? row['דרך התקשרות'] ?? '');
    const createdAt = parseDate(row['תאריך פנייה']);
    const eventDate = parseDate(row['תאריך האירוע']);
    const amount = parseAmount(row['סכום העסקה'] ?? '');
    const reason = (row['מה הסיבה'] ?? '').trim();
    const handler = (row['מי מטפל'] ?? '').trim();
    const notes = (row['כרטיס לקוח'] ?? '').trim();
    const aiNotes = (row['תובנות AI'] ?? '').trim();

    try {
      // 1. Upsert contact
      const { data: existingContacts } = await sb
        .from('contacts')
        .select('id')
        .eq('full_name', fullName)
        .limit(1);

      let contactId: string;
      if (existingContacts && existingContacts.length > 0) {
        contactId = existingContacts[0].id;
        // Update phone if we have one and contact doesn't
        if (phone) {
          await sb.from('contacts').update({ phone }).eq('id', contactId).is('phone', null);
        }
      } else {
        const { data: newContact, error: contactError } = await sb
          .from('contacts')
          .insert({ full_name: fullName, phone })
          .select('id')
          .single();

        if (contactError) {
          console.error(`  Contact error for "${fullName}":`, contactError.message);
          errors++;
          continue;
        }
        contactId = newContact.id;
      }

      // 2. Build metadata
      const metadata: Record<string, unknown> = {};
      if (eventDate) metadata.event_date = eventDate;
      if (amount) metadata.deal_amount = amount;
      if (handler) metadata.handler = handler;
      if (reason) metadata.reason = reason;
      if (aiNotes) metadata.ai_notes = aiNotes;
      if (notes) metadata.client_notes = notes;

      // 3. Create lead
      const leadData: Record<string, unknown> = {
        contact_id: contactId,
        lead_type: leadType,
        status,
        source_platform: sourcePlatform,
        metadata,
        rejection_reason: status === 'rejected' ? (reason || null) : null,
      };
      if (createdAt) leadData.created_at = createdAt;

      const { error: leadError } = await sb
        .from('leads')
        .insert(leadData);

      if (leadError) {
        console.error(`  Lead error for "${fullName}":`, leadError.message);
        errors++;
        continue;
      }

      imported++;
      if (imported % 20 === 0) {
        console.log(`  ...imported ${imported} leads`);
      }
    } catch (err) {
      console.error(`  Exception for "${fullName}":`, err);
      errors++;
    }
  }

  console.log(`\nDone!`);
  console.log(`  Imported: ${imported}`);
  console.log(`  Skipped:  ${skipped}`);
  console.log(`  Errors:   ${errors}`);
}

main().catch(console.error);
