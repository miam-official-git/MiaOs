/**
 * Run with: npx tsx scripts/create-users.ts
 * Creates Omer (admin) and Mia (talent) users in Supabase Auth + profiles table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ranwvoctimijpowzljwv.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const users = [
  { email: 'omer@mia-os.co.il', password: 'Omer2026!', role: 'admin' },
  { email: 'mia@mia-os.co.il', password: 'Mia2026!', role: 'talent' },
];

async function main() {
  for (const u of users) {
    console.log(`Creating ${u.email} (${u.role})...`);

    // Create auth user
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true, // auto-confirm
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`  → User already exists, looking up...`);
        const { data: list } = await sb.auth.admin.listUsers();
        const existing = list?.users.find((x) => x.email === u.email);
        if (existing) {
          // Ensure profile exists
          await sb.from('profiles').upsert({ id: existing.id, role: u.role });
          console.log(`  → Profile synced for ${u.email}`);
        }
        continue;
      }
      console.error(`  ✗ Auth error:`, authError.message);
      continue;
    }

    const userId = authData.user.id;
    console.log(`  → Auth user created: ${userId}`);

    // Insert profile with role
    const { error: profileError } = await sb
      .from('profiles')
      .upsert({ id: userId, role: u.role });

    if (profileError) {
      console.error(`  ✗ Profile error:`, profileError.message);
    } else {
      console.log(`  → Profile created with role: ${u.role}`);
    }
  }

  console.log('\n✅ Done! Users:');
  console.log('  omer@mia-os.co.il / Omer2026!  (admin)');
  console.log('  mia@mia-os.co.il  / Mia2026!   (talent)');
}

main().catch(console.error);
