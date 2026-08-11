import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

// The one gate every (dashboard) route depends on. profiles_select_self
// always lets a signed-in user read their own row regardless of role, so
// this works even to identify (and reject) a non-admin.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/not-authorized');

  return { user, profile };
}

// For server actions (mutations), not pages: a page should redirect a
// non-admin to a friendly screen, but a mutation triggered from a client
// component expects either success or a thrown Error it can toast --
// redirect() would be the wrong signal there. RLS already blocks the actual
// writes for a non-admin regardless, but this gives a clean, immediate
// "Not authorized" instead of a raw Postgres RLS error surfacing to the UI.
export async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Not authorized.');
}
