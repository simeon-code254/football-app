import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DataTable, type Column } from '@/components/data-table/data-table';
import { PaginationControls } from '@/components/data-table/pagination-controls';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/link-button';
import { pageCount, pageRange, parsePage } from '@/lib/pagination';

type NewsRow = {
  id: string;
  title: string;
  is_published: boolean;
  published_at: string;
  profiles: { full_name: string | null } | null;
};

export default async function NewsPage({ searchParams }: { searchParams: { page?: string } }) {
  const page = parsePage(searchParams);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  const { data, count } = await supabase
    .from('news_posts')
    .select('id, title, is_published, published_at, profiles!author_id(full_name)', { count: 'exact' })
    .order('published_at', { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as unknown as NewsRow[];
  const totalPages = pageCount(count ?? 0);

  const columns: Column<NewsRow>[] = [
    {
      header: 'Title',
      cell: (r) => (
        <Link href={`/news/${r.id}`} className="font-medium underline-offset-2 hover:underline">
          {r.title}
        </Link>
      ),
    },
    { header: 'Author', cell: (r) => r.profiles?.full_name ?? 'Matobev' },
    {
      header: 'Status',
      cell: (r) => (r.is_published ? <Badge>Published</Badge> : <Badge variant="outline">Draft</Badge>),
    },
    { header: 'Published', cell: (r) => new Date(r.published_at).toLocaleDateString() },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">News</h1>
          <p className="text-sm text-muted-foreground">
            Published posts appear in the mobile app&apos;s News screen for any signed-in user.
          </p>
        </div>
        <LinkButton href="/news/new">New post</LinkButton>
      </div>

      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} emptyMessage="No news posts yet." />
      <PaginationControls page={page} totalPages={totalPages} basePath="/news" searchParams={{}} />
    </div>
  );
}
