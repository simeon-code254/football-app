import { Skeleton } from '@/components/ui/skeleton';

export function DetailSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <Skeleton className="h-40 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  );
}
