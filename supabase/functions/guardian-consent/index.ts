// A page a parent or guardian can actually open.
//
// 20260815100000 built the consent record and confirm_guardian_consent(token),
// and 20260820151000 now blocks AI analysis of an under-18's video without it.
// Neither is any use if the guardian has nowhere to confirm: the token existed
// but there was no endpoint, so a minor would have been permanently unable to
// be analysed -- legally safe, but a dead end.
//
// Served as HTML from an Edge Function rather than a separate web app,
// because the alternative is standing up hosting purely for one page. The
// guardian opens a link the player sends them -- WhatsApp or SMS, which is how
// this audience actually shares things, not email -- reads what is being
// asked, and confirms.
//
// Deliberately not authenticated. The guardian has no account and should not
// need one; the unguessable single-use token IS the credential, and
// confirm_guardian_consent rotates it on use so a forwarded link cannot be
// replayed. Deployed with --no-verify-jwt for the same reason.
//
// This is "email/link confirmation" grade consent. Some jurisdictions require
// stronger verification (card check, signed form, video call). The method is
// recorded on the row as such so it can be audited and upgraded later, and
// this file does not pretend otherwise.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(title: string, body: string, tone: 'ok' | 'error' | 'ask' = 'ask') {
  const accent = tone === 'ok' ? '#15803D' : tone === 'error' ? '#B91C1C' : '#1A6DFF';
  return new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Matobev</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
         background:#F4F6F9; color:#0B1220; display:flex; justify-content:center; padding:24px; }
  @media (prefers-color-scheme: dark) { body { background:#0A1628; color:#F5F7FA; } .card { background:#131B2E !important; } }
  .card { background:#fff; border-radius:16px; padding:28px; max-width:520px; width:100%;
          box-shadow:0 8px 24px rgba(11,18,32,.10); }
  h1 { font-size:20px; margin:0 0 12px; }
  p { line-height:1.55; margin:0 0 14px; }
  ul { line-height:1.7; padding-left:20px; }
  .accent { color:${accent}; font-weight:600; }
  button { width:100%; padding:14px; font-size:16px; font-weight:600; border:0; border-radius:12px;
           background:${accent}; color:#fff; cursor:pointer; }
  .muted { font-size:13px; opacity:.72; }
</style></head><body><div class="card">${body}</div></body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return page('Link not valid', '<h1>This link is not valid</h1><p>Ask the player to send you a new consent link from the Matobev app.</p>', 'error');
  }

  // Service role, because guardian_consents is RLS-protected and the guardian
  // has no account. Only the row matching this exact token is ever read.
  const { data: row } = await admin
    .from('guardian_consents')
    .select('id, player_id, guardian_name, consents_to_account, consents_to_ai_analysis, consents_to_scout_contact, confirmed_at, revoked_at')
    .eq('confirmation_token', token)
    .maybeSingle();

  if (!row || row.revoked_at) {
    return page('Link not valid', '<h1>This link has expired</h1><p>It may already have been used, or consent may have been withdrawn. Ask the player to send a new one.</p>', 'error');
  }
  if (row.confirmed_at) {
    return page('Already confirmed', '<h1 class="accent">Already confirmed</h1><p>Thank you — consent for this account is already on record. Nothing further is needed.</p>', 'ok');
  }

  // The player's name is shown so a guardian can tell whether this is
  // actually their child, rather than confirming something anonymous.
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', row.player_id)
    .maybeSingle();
  const playerName = profile?.full_name ?? 'a player';

  if (req.method === 'POST') {
    const { data: ok } = await admin.rpc('confirm_guardian_consent', { p_token: token });
    return ok
      ? page('Confirmed', `<h1 class="accent">Consent confirmed</h1><p>Thank you. ${esc(playerName)} can now use the features you approved.</p><p class="muted">You can withdraw this at any time by contacting support from the app's Help screen.</p>`, 'ok')
      : page('Link not valid', '<h1>This link has expired</h1><p>Ask the player to send you a new consent link.</p>', 'error');
  }

  // Only the scopes actually requested are listed. Showing a fixed list would
  // ask a guardian to agree to things the record does not contain.
  const scopes: string[] = [];
  if (row.consents_to_account) scopes.push('Hold an account on Matobev');
  if (row.consents_to_ai_analysis)
    scopes.push('Have their football videos analysed automatically. This measures their movement from the video — it is processing of their body, and it is why we ask separately.');
  if (row.consents_to_scout_contact) scopes.push('Be contacted by scouts through the app');

  return page(
    'Consent request',
    `<h1>Consent for ${esc(playerName)}</h1>
     <p>${esc(playerName)} is under 18 and has asked you, as their parent or guardian, to approve the following:</p>
     <ul>${scopes.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
     <p class="muted">Videos are visible to scouts on the platform. You can withdraw consent at any time, and the account can be deleted from within the app.</p>
     <form method="POST"><button type="submit">I am ${esc(row.guardian_name)} and I consent</button></form>`
  );
});
