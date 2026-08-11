import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton({ columns = 5, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-20" />
        ))}
      </div>
      <div className="space-y-2 rounded-md border p-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
