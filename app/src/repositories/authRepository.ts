import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type Role = 'player' | 'scout';

export type SignUpInput = {
  email: string;
  password: string;
  role: Role;
  fullName: string;
  organization?: string;
};

// Shape here is load-bearing: handle_new_user() (DB trigger) reads
// raw_user_meta_data.role/full_name/organization to create the profiles row
// and matching skeleton players/scouts row.
export async function signUp({ email, password, role, fullName, organization }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
        ...(role === 'scout' ? { organization } : {}),
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Calls the delete-account Edge Function (supabase/functions/delete-account)
// rather than any direct table operation -- deleting the auth user (which
// cascades through profiles/players/scouts/videos/trials/messages/etc via
// existing FKs, plus explicit Storage cleanup) needs the service_role key,
// which the client must never hold. The function derives "who" from the
// caller's own session token automatically (supabase.functions.invoke
// forwards the current session's Authorization header) — no user id is
// ever passed explicitly.
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function isEmailConfirmed(): Promise<boolean> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return Boolean(data.user?.email_confirmed_at);
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return data.subscription;
}
