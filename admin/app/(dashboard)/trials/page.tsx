import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link-button';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type TrialRow = {
  id: string;
  title: string;
  club: string;
  location: string;
  trial_date: string;
  status: string;
  scouts: { profiles: { full_name: string | null } | null } | null;
};

const STATUS_FILTERS = ['all', 'open', 'closed', 'cancelled'] as const;

export default async function TrialsPage({
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
    .from('trials')
    .select('id, title, club, location, trial_date, status, scouts(profiles!id(full_name))', { count: 'exact' });

  if (status !== 'all') query = query.eq('status', status);

  const { data, count } = await query.order('trial_date', { ascending: false }).range(from, to);

  const rows = (data ?? []) as TrialRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<TrialRow>[] = [
    {
      header: 'Title',
      cell: (r) => (
        <Link href={`/trials/${r.id}`} className="font-medium underline-offset-2 hover:underline">
          {r.title}
        </Link>
      ),
    },
    { header: 'Club', cell: (r) => r.club },
    { header: 'Location', cell: (r) => r.location },
    { header: 'Posted by', cell: (r) => r.scouts?.profiles?.full_name ?? 'Matobev' },
    { header: 'Status', cell: (r) => <Badge variant="outline" className="capitalize">{r.status}</Badge> },
    { header: 'Date', cell: (r) => new Date(r.trial_date).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Trials</h1>
          <p className="text-sm text-muted-foreground">All trials across every scout, plus ones posted by Matobev.</p>
        </div>
        <LinkButton href="/trials/new">New trial</LinkButton>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((s) => (
          <LinkButton key={s} size="sm" variant={s === status ? 'default' : 'outline'} href={`/trials?status=${s}`}>
            {s === 'all' ? 'All' : s[0].toUpperCase() + s.slice(1)}
          </LinkButton>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No trials match." />
      <PaginationControls page={page} totalPages={totalPages} basePath="/trials" searchParams={{ status }} />
    </div>
  );
}
