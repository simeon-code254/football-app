import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';

type Props = {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
};

function hrefForPage(basePath: string, searchParams: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value && key !== 'page') params.set(key, value);
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PaginationControls({ page, totalPages, basePath, searchParams }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <LinkButton variant="outline" size="sm" href={hrefForPage(basePath, searchParams, page - 1)}>
            Previous
          </LinkButton>
        )}
        {page >= totalPages ? (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <LinkButton variant="outline" size="sm" href={hrefForPage(basePath, searchParams, page + 1)}>
            Next
          </LinkButton>
        )}
      </div>
    </div>
  );
}
