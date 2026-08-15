// Sends a push notification for a row that was just inserted into
// `notifications`.
//
// Why this shape: the app already creates every notification through
// SECURITY DEFINER triggers (trial status changes, invitations, analysis
// results, moderation). Rather than teach each of those about push, this
// function is invoked once per new notification row and fans it out to
// whatever devices that profile has registered. Every existing trigger
// therefore gains push for free, and future ones do too.
//
// Delivery goes through Expo's push service, which is the correct target
// for an Expo-built app: it holds the APNs/FCM credentials and accepts the
// ExponentPushToken the client registers. No Apple or Google keys ever
// reach this function.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.31.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
// Expo accepts up to 100 messages per request.
const CHUNK = 100;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type NotificationRow = {
  id: string;
  profile_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** True when the recipient's local time falls inside their quiet hours. */
function inQuietHours(from: number | null, to: number | null, nowMinute: number): boolean {
  if (from == null || to == null) return false;
  // A window that wraps midnight (e.g. 22:00 -> 07:00) is the normal case,
  // so it has to be handled rather than treated as invalid.
  return from <= to ? nowMinute >= from && nowMinute < to : nowMinute >= from || nowMinute < to;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Only the database webhook (or an operator) may call this -- it sends
  // real notifications to real devices, so it must not be openly callable.
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-webhook-secret') !== secret) {
    return json(401, { error: 'unauthorized' });
  }

  let record: NotificationRow | null = null;
  try {
    const payload = await req.json();
    // Supabase database webhooks post { type, table, record, old_record }.
    record = payload.record ?? payload;
  } catch {
    return json(400, { error: 'invalid json' });
  }
  if (!record?.profile_id || !record?.title) return json(400, { error: 'missing profile_id/title' });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Respect the recipient's own preferences before doing any work.
  const { data: prefs } = await supabase
    .from('notification_preferences')
    .select('muted_types, quiet_from_minute, quiet_to_minute')
    .eq('profile_id', record.profile_id)
    .maybeSingle();

  if (prefs?.muted_types?.includes(record.type)) {
    return json(200, { skipped: 'type muted' });
  }
  const now = new Date();
  if (inQuietHours(prefs?.quiet_from_minute ?? null, prefs?.quiet_to_minute ?? null, now.getUTCHours() * 60 + now.getUTCMinutes())) {
    return json(200, { skipped: 'quiet hours' });
  }

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('profile_id', record.profile_id);
  if (error) return json(500, { error: error.message });
  if (!tokens?.length) return json(200, { skipped: 'no registered devices' });

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title: record!.title,
    body: record!.body ?? '',
    // Carried through so tapping the notification can deep-link to the
    // same place the in-app notification row routes to.
    data: { notificationId: record!.id, type: record!.type, ...(record!.data ?? {}) },
  }));

  const receipts: unknown[] = [];
  for (let i = 0; i < messages.length; i += CHUNK) {
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages.slice(i, i + CHUNK)),
    });
    receipts.push(await res.json());
  }

  // Expo reports a DeviceNotRegistered error for tokens belonging to an
  // uninstalled app. Leaving those in the table means every future send
  // wastes a round-trip on a device that will never receive anything, so
  // they are pruned here.
  const dead: string[] = [];
  for (const r of receipts as { data?: { status: string; details?: { error?: string } }[] }[]) {
    r.data?.forEach((item, idx) => {
      if (item.status === 'error' && item.details?.error === 'DeviceNotRegistered') {
        dead.push(messages[idx].to);
      }
    });
  }
  if (dead.length) await supabase.from('push_tokens').delete().in('token', dead);

  return json(200, { sent: messages.length, pruned: dead.length });
});
