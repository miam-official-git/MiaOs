import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Get current user + role from profiles table (server-side via service client) */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // On the server we can't read the browser session directly.
  // This function is meant to be called from server components/actions
  // that receive the user id through a different channel (e.g. cookie validation).
  // For now, we provide a helper that works with the browser client's session.
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const sb = createServiceClient();
  const { data: profile } = await sb
    .from('profiles')
    .select('id, role')
    .eq('id', session.user.id)
    .single();

  if (!profile) return null;

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: profile.role,
  };
}

/** Redirect to /login if not authenticated */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Redirect to /login if not authenticated, or throw if not admin */
export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') redirect('/');
  return user;
}

/** Role check helpers */
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isTalent(role: UserRole): boolean {
  return role === 'talent';
}
