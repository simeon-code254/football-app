import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Supabase fires the same SIGNED_OUT event whether the user tapped Sign Out
// or their refresh token expired, and the app needs to tell those apart: one
// deserves the login screen, the other deserves an explanation. This flag is
// raised immediately before every deliberate sign-out, so an unflagged
// SIGNED_OUT is by elimination an involuntary one.
//
// It is read destructively (consumeDeliberateSignOut) so a single deliberate
// sign-out cannot mask a genuine expiry later in the session.
let deliberateSignOut = false;

/** True if the sign-out now in flight was one the user asked for. Clears on read. */
export function consumeDeliberateSignOut(): boolean {
  const was = deliberateSignOut;
  deliberateSignOut = false;
  return was;
}

/** Marks the sign-out about to happen as deliberate. */
export function markDeliberateSignOut() {
  deliberateSignOut = true;
}

export type Role = 'player' | 'scout' | 'club';

/**
 * The two ID-checked roles. Both must supply an organisation name at signup,
 * and both are gated behind verification before they can see under-18 players
 * -- which is the rule canvas screen 03 states to the user in as many words.
 */
export const ID_CHECKED_ROLES: readonly Role[] = ['scout', 'club'];

export type SignUpInput = {
  email: string;
  password: string;
  role: Role;
  fullName: string;
  organization?: string;
};

// Shape here is load-bearing: handle_new_user() (DB trigger) reads
// raw_user_meta_data.role/full_name/organization to create the profiles row
// and matching skeleton players/scouts/clubs row.
export async function signUp({ email, password, role, fullName, organization }: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
        full_name: fullName,
        // A club's name arrives in the same field as a scout's organisation;
        // handle_new_user() reads it into clubs.name.
        ...(ID_CHECKED_ROLES.includes(role) ? { organization } : {}),
      },
    },
  });
  if (error) throw error;
  // Supabase deliberately doesn't return an error for signUp() against an
  // already-registered email (email-enumeration protection) -- it silently
  // no-ops instead (resending the confirmation email if unconfirmed, or
  // nothing at all if already confirmed) and returns a normal-looking 200
  // with no new identity attached to the user. An empty identities array is
  // the documented signal that this "succeeded" without actually creating
  // a new account -- previously unchecked, so the app just proceeded to
  // Verify Email as if signup had genuinely worked.
  if (data.user && data.user.identities?.length === 0) {
    throw new Error('An account with this email already exists. Try logging in instead.');
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  markDeliberateSignOut();
  const { error } = await supabase.auth.signOut();
  // Cleared on failure: nothing signed out, so a later expiry must still be
  // reported as one.
  if (error) {
    consumeDeliberateSignOut();
    throw error;
  }
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
  // Deleting the auth user server-side ends the session, so Supabase fires
  // the same SIGNED_OUT event an expired token would. Flagged as deliberate
  // so someone who just deleted their account is not then told their session
  // expired.
  markDeliberateSignOut();
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function resendVerificationEmail(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

/**
 * Confirm a signup with the 6-digit code from the email.
 *
 * -- REQUIRES A SUPABASE EMAIL TEMPLATE CHANGE --
 *
 * Canvas screen 06 draws a six-box OTP field with a resend countdown, not a
 * "tap the link in your email" screen. Supabase can do either, but which one
 * the user receives is decided by the "Confirm signup" email template, not by
 * this code: the default template interpolates {{ .ConfirmationURL }}, and the
 * code path needs {{ .Token }} in the template.
 *
 * Until that template is updated in the Supabase dashboard, the email will
 * still contain only a link and this call will fail with "Token has expired or
 * is invalid" for every code the user types -- because there is no code to
 * type. The verify screen therefore keeps the link path working alongside it
 * (it polls isEmailConfirmed), so the flow is not broken while the template
 * says what it currently says.
 *
 * Adding {{ .Token }} to the template is safe for the link path: a template can
 * contain both, and many do.
 */
export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  if (error) throw error;
  return data;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export async function changePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// scope: 'global' revokes every refresh token for this user, not just the
// current device's -- a real "sign out everywhere" action, distinct from
// the plain signOut() above which only ends the current session.
export async function signOutAllDevices() {
  markDeliberateSignOut();
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) {
    consumeDeliberateSignOut();
    throw error;
  }
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

export function onAuthStateChange(cb: (session: Session | null, event: AuthChangeEvent) => void) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(session, event));
  return data.subscription;
}
