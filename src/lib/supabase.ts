import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client — uses anon key, respects RLS policies
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server client — uses service_role key, bypasses RLS
// Use ONLY in API routes and server-side code (webhooks, crons)
export function createServiceClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

// Auth-aware client for server-side auth checks
// Uses the anon key but without session persistence (session comes from browser cookie)
export function createAuthClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
