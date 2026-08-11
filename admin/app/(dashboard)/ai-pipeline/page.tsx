import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { JobStatusBadge } from '@/components/ai-pipeline/job-status-badge';
import { RequeueButton } from '@/components/ai-pipeline/requeue-button';
import { LinkButton } from '@/components/ui/link-button';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type JobRow = {
  id: string;
  status: string;
  requested_at: string;
  started_at: string | null;
  completed_at: string | null;
  error: string | null;
  video_id: string;
  videos: { title: string | null; players: { profiles: { full_name: string | null } | null } | null } | null;
};

const STATUS_FILTERS = ['all', 'queued', 'processing', 'completed', 'failed'] as const;

export default async function AiPipelinePage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const status = STATUS_FILTERS.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUS_FILTERS)[number])
    : 'all';
  const page = parsePage(searchParams);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('video_analysis_jobs')
    .select(
      'id, status, requested_at, started_at, completed_at, error, video_id, videos(title, players(profiles(full_name)))',
      { count: 'exact' }
    );

  if (status !== 'all') query = query.eq('status', status);

  const { data, count } = await query.order('requested_at', { ascending: false }).range(from, to);

  const rows = (data ?? []) as JobRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<JobRow>[] = [
    {
      header: 'Video',
      cell: (r) => (
        <Link href={`/videos/${r.video_id}`} className="font-medium underline-offset-2 hover:underline">
          {r.videos?.title || 'Untitled'}
        </Link>
      ),
    },
    { header: 'Player', cell: (r) => r.videos?.players?.profiles?.full_name ?? 'Unknown' },
    { header: 'Status', cell: (r) => <JobStatusBadge status={r.status} /> },
    { header: 'Error', cell: (r) => (r.error ? <span className="text-destructive">{r.error}</span> : '—') },
    { header: 'Requested', cell: (r) => new Date(r.requested_at).toLocaleString() },
    { header: '', cell: (r) => (r.status === 'failed' ? <RequeueButton jobId={r.id} /> : null) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          AI analysis job health. Requeue resets a failed job back to queued -- ai-service picks it up on its
          next poll (≤2 min by default), not instantly.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <LinkButton key={s} size="sm" variant={s === status ? 'default' : 'outline'} href={`/ai-pipeline?status=${s}`}>
            {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
          </LinkButton>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No jobs match." />
      <PaginationControls page={page} totalPages={totalPages} basePath="/ai-pipeline" searchParams={{ status }} />
    </div>
  );
}
