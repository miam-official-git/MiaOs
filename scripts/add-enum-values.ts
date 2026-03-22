/**
 * Add missing lead_status enum values to the Supabase database.
 *
 * Usage: npx tsx scripts/add-enum-values.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

async function run() {
  console.log('URL:', supabaseUrl);

  // Use the Supabase SQL API (pg_net or direct)
  const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
  console.log('Project ref:', projectRef);

  // Try using the management API directly via SQL
  const statements = [
    "ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'quoted'",
    "ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'lost'",
    "ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'negotiating'",
    "ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'archived'",
    // Also drop the rejection_reason constraint so we can import rejected leads without a reason
    "ALTER TABLE leads DROP CONSTRAINT IF EXISTS chk_leads_rejection_reason",
  ];

  for (const sql of statements) {
    console.log(`\nExecuting: ${sql}`);

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ query: sql }),
    });

    console.log('  Status:', res.status);
    const text = await res.text();
    if (text) console.log('  Response:', text.substring(0, 200));
  }
}

run().catch(console.error);
