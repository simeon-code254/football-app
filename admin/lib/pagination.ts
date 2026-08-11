export const PAGE_SIZE = 20;

export function parsePage(searchParams: { page?: string }): number {
  const page = Number(searchParams.page);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

// Supabase's .range(from, to) is inclusive on both ends.
export function pageRange(page: number, pageSize: number = PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return [from, to];
}

export function pageCount(total: number, pageSize: number = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
