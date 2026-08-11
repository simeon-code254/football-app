import { Skeleton } from '@/components/ui/skeleton';

export function StatGridSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 4 }).map((_, section) => (
        <div key={section} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
