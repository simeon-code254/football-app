import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { SearchInput } from '@/components/data-table/search-input';
import { VideoStatusBadge } from '@/components/videos/video-status-badge';
import { LinkButton } from '@/components/ui/link-button';
import { Badge } from '@/components/ui/badge';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type VideoRow = {
  id: string;
  title: string | null;
  status: string;
  upload_intent: string;
  created_at: string;
  view_count: number;
  is_removed: boolean;
  players: { profiles: { full_name: string | null } | null } | null;
};

const STATUS_FILTERS = ['all', 'uploaded', 'processing', 'ready', 'failed'] as const;

export default async function VideosPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string; q?: string };
}) {
  const status = STATUS_FILTERS.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUS_FILTERS)[number])
    : 'all';
  const q = searchParams.q?.trim();
  const page = parsePage(searchParams);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('videos')
    .select('id, title, status, upload_intent, created_at, view_count, is_removed, players(profiles(full_name))', {
      count: 'exact',
    });

  if (status !== 'all') query = query.eq('status', status);
  if (q) query = query.ilike('title', `%${q}%`);

  const { data, count } = await query.order('created_at', { ascending: false }).range(from, to);

  const rows = (data ?? []) as VideoRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<VideoRow>[] = [
    {
      header: 'Title',
      cell: (r) => (
        <Link href={`/videos/${r.id}`} className="font-medium underline-offset-2 hover:underline">
          {r.title || 'Untitled'}
        </Link>
      ),
    },
    { header: 'Uploader', cell: (r) => r.players?.profiles?.full_name ?? 'Unknown' },
    { header: 'Intent', cell: (r) => (r.upload_intent === 'ai_analysis' ? 'AI Analysis' : 'Highlight') },
    {
      header: 'Status',
      cell: (r) => (
        <div className="flex gap-1">
          <VideoStatusBadge status={r.status} />
          {r.is_removed && <Badge variant="destructive">Removed</Badge>}
        </div>
      ),
    },
    { header: 'Views', cell: (r) => r.view_count },
    { header: 'Uploaded', cell: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Videos</h1>
        <p className="text-sm text-muted-foreground">
          Every uploaded video, including non-ready ones (visible to admin only).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <LinkButton
            key={s}
            size="sm"
            variant={s === status ? 'default' : 'outline'}
            href={`/videos?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          >
            {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
          </LinkButton>
        ))}
        <SearchInput placeholder="Search by title…" />
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No videos match." />
      <PaginationControls page={page} totalPages={totalPages} basePath="/videos" searchParams={{ status, q }} />
    </div>
  );
}
