import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { SearchInput } from '@/components/data-table/search-input';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link-button';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type ProfileRow = {
  id: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  is_active: boolean;
};

// Admin accounts are managed directly in the database (promotion is a
// manual SQL step by design, see README) -- this page is for moderating
// the actual userbase, so admin rows are excluded everywhere here, not just
// filtered by default.
const ROLE_FILTERS = ['all', 'player', 'scout'] as const;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { page?: string; role?: string; q?: string };
}) {
  const role = ROLE_FILTERS.includes(searchParams.role as never)
    ? (searchParams.role as (typeof ROLE_FILTERS)[number])
    : 'all';
  const q = searchParams.q?.trim();
  const page = parsePage(searchParams);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select('id, role, full_name, phone, created_at, is_active', { count: 'exact' })
    .neq('role', 'admin');

  if (role !== 'all') query = query.eq('role', role);
  if (q) query = query.ilike('full_name', `%${q}%`);

  const { data, count } = await query.order('created_at', { ascending: false }).range(from, to);

  const rows = (data ?? []) as ProfileRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<ProfileRow>[] = [
    {
      header: 'Name',
      cell: (r) => (
        <Link href={`/users/${r.id}`} className="font-medium underline-offset-2 hover:underline">
          {r.full_name ?? 'Unnamed'}
        </Link>
      ),
    },
    { header: 'Role', cell: (r) => <Badge variant="outline" className="capitalize">{r.role}</Badge> },
    {
      header: 'Status',
      cell: (r) => (r.is_active ? <Badge variant="outline">Active</Badge> : <Badge variant="destructive">Suspended</Badge>),
    },
    { header: 'Phone', cell: (r) => r.phone ?? '—' },
    { header: 'Joined', cell: (r) => new Date(r.created_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-muted-foreground">Players and scouts. Admin accounts aren&apos;t listed here.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {ROLE_FILTERS.map((r) => (
          <LinkButton
            key={r}
            size="sm"
            variant={r === role ? 'default' : 'outline'}
            href={`/users?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
          >
            {r === 'all' ? 'All' : r[0].toUpperCase() + r.slice(1)}
          </LinkButton>
        ))}
        <SearchInput placeholder="Search by name…" />
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No users match." />
      <PaginationControls page={page} totalPages={totalPages} basePath="/users" searchParams={{ role, q }} />
    </div>
  );
}
