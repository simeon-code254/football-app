import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SuspendControl } from '@/components/users/suspend-control';

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', params.id).single();
  // Admin accounts are managed via direct DB access, not through this
  // moderation-focused page (see Users list's own exclusion) -- guard the
  // detail route too in case someone hits the URL directly.
  if (!profile || profile.role === 'admin') notFound();

  const [player, scout, videoCount] = await Promise.all([
    profile.role === 'player'
      ? supabase.from('players').select('*').eq('id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.role === 'scout'
      ? supabase.from('scouts').select('*').eq('id', params.id).maybeSingle()
      : Promise.resolve({ data: null }),
    profile.role === 'player'
      ? supabase.from('videos').select('*', { count: 'exact', head: true }).eq('player_id', params.id)
      : Promise.resolve({ count: null }),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-2xl font-semibold">{profile.full_name ?? 'Unnamed'}</h1>
          <Badge variant="outline" className="mt-1 capitalize">
            {profile.role}
          </Badge>
        </div>
        {!profile.is_active && (
          <Badge variant="destructive" className="ml-auto">
            Suspended
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">Phone: </span>
            {profile.phone ?? '—'}
          </div>
          <div>
            <span className="text-muted-foreground">Joined: </span>
            {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </CardContent>
      </Card>

      {profile.role === 'player' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Player</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {player.data ? (
              <>
                <div>
                  <span className="text-muted-foreground">Position: </span>
                  {player.data.primary_position ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Club: </span>
                  {player.data.club ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Height / Weight: </span>
                  {player.data.height_cm ?? '—'}cm / {player.data.weight_kg ?? '—'}kg
                </div>
                <div>
                  <span className="text-muted-foreground">Overall rating: </span>
                  {player.data.overall_rating ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Videos uploaded: </span>
                  {videoCount.count ?? 0}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No player row found (profile may be incomplete).</p>
            )}
          </CardContent>
        </Card>
      )}

      {profile.role === 'scout' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {scout.data ? (
              <>
                <div>
                  <span className="text-muted-foreground">Organization: </span>
                  {scout.data.organization ?? '—'}
                </div>
                <div>
                  <span className="text-muted-foreground">Verification: </span>
                  <Badge variant="outline" className="capitalize">
                    {scout.data.verification_status}
                  </Badge>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No scout row found.</p>
            )}
          </CardContent>
        </Card>
      )}

      {viewer?.id !== profile.id ? (
        <SuspendControl
          profileId={profile.id}
          isActive={profile.is_active}
          suspendedReason={profile.suspended_reason}
          suspendedAt={profile.suspended_at}
        />
      ) : (
        <p className="text-sm text-muted-foreground">You can&apos;t suspend your own account.</p>
      )}
    </div>
  );
}
