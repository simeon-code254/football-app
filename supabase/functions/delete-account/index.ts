// Deletes the calling user's own account. There is no way for a regular
// (anon-key) client to call auth.admin.deleteUser directly -- that needs
// the service_role key, which must never reach the app. This function is
// the bridge: it verifies the caller's own JWT identifies a real signed-in
// user, then uses service_role internally (never exposed to the client) to
// do the actual deletion. profiles/players/scouts/videos/trials/messages/
// etc. all cascade via existing `on delete cascade` FKs once auth.users is
// gone -- only Storage objects need explicit cleanup first, since Storage
// isn't covered by Postgres FK cascades.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const BUCKETS = ['avatars', 'videos', 'verification-documents'];

// Edge Functions don't get CORS headers for free -- a browser calling this
// (supabase.functions.invoke from the web app) sends a preflight OPTIONS
// request first, and every actual response needs Access-Control-Allow-*
// too, or the browser blocks the response before the app ever sees it.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function deleteAllUnderPrefix(
  client: ReturnType<typeof createClient>,
  bucket: string,
  prefix: string
): Promise<void> {
  const { data: entries } = await client.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!entries || entries.length === 0) return;

  const files: string[] = [];
  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;
    // Supabase Storage represents subfolders as entries with id === null
    if (entry.id === null) {
      await deleteAllUnderPrefix(client, bucket, path);
    } else {
      files.push(path);
    }
  }
  if (files.length) {
    await client.storage.from(bucket).remove(files);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Identifies the caller from their own JWT -- this is the only source of
  // truth for "who", never a userId passed in the request body (which a
  // malicious caller could set to someone else's id). auth.getUser() with
  // no argument reads the client's own in-memory session state (empty on a
  // freshly constructed client) -- it does NOT fall back to a manually
  // attached Authorization header, even via `global.headers`. The token
  // must be passed explicitly.
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  const callerClient = createClient(supabaseUrl, anonKey);
  const { data: userData, error: userError } = await callerClient.auth.getUser(jwt);
  if (userError || !userData.user) {
    return jsonResponse({ error: 'Invalid session' }, 401);
  }
  const userId = userData.user.id;

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  for (const bucket of BUCKETS) {
    try {
      await deleteAllUnderPrefix(adminClient, bucket, userId);
    } catch (err) {
      // Storage cleanup failing shouldn't block the actual account
      // deletion -- an orphaned private object is a minor cleanup issue,
      // not a reason to leave the user's account (and its data) intact.
      console.error(`Storage cleanup failed for bucket ${bucket}:`, err);
    }
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    return jsonResponse({ error: deleteError.message }, 500);
  }

  return jsonResponse({ success: true }, 200);
});
