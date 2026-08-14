import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { LinkButton } from '@/components/ui/link-button';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type ScoutRow = {
  id: string;
  organization: string | null;
  verification_status: string;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

const STATUS_FILTERS = ['pending', 'verified', 'rejected'] as const;

export default async function ScoutVerificationPage({
  searchParams,
}: {
  searchParams: { page?: string; status?: string };
}) {
  const status = STATUS_FILTERS.includes(searchParams.status as never)
    ? (searchParams.status as (typeof STATUS_FILTERS)[number])
    : 'pending';
  const page = parsePage(searchParams);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const { data, count } = await supabase
    .from('scouts')
    .select('id, organization, verification_status, created_at, profiles!scouts_id_fkey(full_name, avatar_url)', {
      count: 'exact',
    })
    .eq('verification_status', status)
    .order('created_at', { ascending: true })
    .range(from, to);

  const rows = (data ?? []) as ScoutRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<ScoutRow>[] = [
    { header: 'Scout', cell: (r) => r.profiles?.full_name ?? 'Unnamed scout' },
    { header: 'Organization', cell: (r) => r.organization ?? '—' },
    { header: 'Submitted', cell: (r) => new Date(r.created_at).toLocaleDateString() },
    {
      header: '',
      cell: (r) => (
        <LinkButton size="sm" variant="outline" href={`/scout-verification/${r.id}`}>
          Review
        </LinkButton>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Scout Verification</h1>
        <p className="text-sm text-muted-foreground">Review submitted documents and approve or reject scouts.</p>
      </div>

      <div className="flex gap-2">
        {STATUS_FILTERS.map((s) => (
          <LinkButton
            key={s}
            size="sm"
            variant={s === status ? 'default' : 'outline'}
            href={`/scout-verification?status=${s}`}
          >
            {s[0].toUpperCase() + s.slice(1)}
          </LinkButton>
        ))}
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage={`No ${status} scouts.`} />
      <PaginationControls
        page={page}
        totalPages={totalPages}
        basePath="/scout-verification"
        searchParams={{ status }}
      />
    </div>
  );
}
