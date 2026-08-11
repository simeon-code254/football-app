import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { ResolveControl } from '@/components/reports/resolve-control';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link-button';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type ReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

const STATUS_FILTERS = ['open', 'resolved', 'dismissed'] as const;

function targetHref(type: string, id: string): string | null {
  if (type === 'video') return `/videos/${id}`;
  if (type === 'profile') return `/users/${id}`;
  return null;
}

export default async function ReportsPage({ searchParams }: { searchParams: { page?: string; status?: string } }) {
  const status = STATUS_FILTERS.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUS_FILTERS)[number])
    : 'open';
  const page = parsePage(searchParams);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const { data, count } = await supabase
    .from('reports')
    .select('id, target_type, target_id, reason, status, admin_notes, created_at, profiles!reporter_id(full_name)', {
      count: 'exact',
    })
    .eq('status', status)
    .order('created_at', { ascending: true })
    .range(from, to);

  const rows = (data ?? []) as unknown as ReportRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<ReportRow>[] = [
    { header: 'Reporter', cell: (r) => r.profiles?.full_name ?? 'Unknown' },
    {
      header: 'Target',
      cell: (r) => {
        const href = targetHref(r.target_type, r.target_id);
        return (
          <span>
            <Badge variant="outline" className="mr-1 capitalize">
              {r.target_type}
            </Badge>
            {href ? (
              <Link href={href} className="underline-offset-2 hover:underline">
                {r.target_id.slice(0, 8)}…
              </Link>
            ) : (
              <span className="text-muted-foreground">{r.target_id.slice(0, 8)}…</span>
            )}
          </span>
        );
      },
    },
    { header: 'Reason', cell: (r) => <span className="line-clamp-2 max-w-xs text-sm">{r.reason}</span> },
    { header: 'Reported', cell: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      header: '',
      cell: (r) => (status === 'open' ? <ResolveControl reportId={r.id} /> : r.admin_notes || '—'),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          User-submitted content reports. Empty until the mobile app has a &quot;Report&quot; button wired up.
        </p>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <LinkButton key={s} size="sm" variant={s === status ? 'default' : 'outline'} href={`/reports?status=${s}`}>
            {s[0].toUpperCase() + s.slice(1)}
          </LinkButton>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage={`No ${status} reports.`} />
      <PaginationControls page={page} totalPages={totalPages} basePath="/reports" searchParams={{ status }} />
    </div>
  );
}
