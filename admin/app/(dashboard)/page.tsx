import { createClient } from '@/lib/supabase/server';
import { StatCard } from '@/components/dashboard/stat-card';

export default async function DashboardPage() {
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [
    players,
    scouts,
    pendingScouts,
    verifiedScouts,
    videosUploaded,
    videosProcessing,
    videosReady,
    videosFailed,
    openTrials,
    jobsQueued,
    jobsProcessing,
    jobsCompleted,
    jobsFailed,
    signups7d,
    signups30d,
    suspendedAccounts,
    removedVideos,
    openReports,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'player'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'scout'),
    supabase.from('scouts').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
    supabase.from('scouts').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'uploaded'),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'ready'),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('trials').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('video_analysis_jobs').select('*', { count: 'exact', head: true }).eq('status', 'queued'),
    supabase.from('video_analysis_jobs').select('*', { count: 'exact', head: true }).eq('status', 'processing'),
    supabase.from('video_analysis_jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('video_analysis_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', false),
    supabase.from('videos').select('*', { count: 'exact', head: true }).eq('is_removed', true),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live counts, straight from Supabase.</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Users</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Players" value={players.count ?? 0} />
          <StatCard label="Scouts" value={scouts.count ?? 0} />
          <StatCard label="Signups (7d)" value={signups7d.count ?? 0} />
          <StatCard label="Signups (30d)" value={signups30d.count ?? 0} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Scout Verification</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Pending" value={pendingScouts.count ?? 0} />
          <StatCard label="Verified" value={verifiedScouts.count ?? 0} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Videos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Uploaded" value={videosUploaded.count ?? 0} />
          <StatCard label="Processing" value={videosProcessing.count ?? 0} />
          <StatCard label="Ready" value={videosReady.count ?? 0} />
          <StatCard label="Failed" value={videosFailed.count ?? 0} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">AI Pipeline</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Queued" value={jobsQueued.count ?? 0} />
          <StatCard label="Processing" value={jobsProcessing.count ?? 0} />
          <StatCard label="Completed" value={jobsCompleted.count ?? 0} />
          <StatCard label="Failed" value={jobsFailed.count ?? 0} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Trials</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Open" value={openTrials.count ?? 0} />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Moderation</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Suspended accounts" value={suspendedAccounts.count ?? 0} />
          <StatCard label="Removed videos" value={removedVideos.count ?? 0} />
          <StatCard label="Open reports" value={openReports.count ?? 0} />
        </div>
      </section>
    </div>
  );
}
