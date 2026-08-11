import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  queued: 'outline',
  processing: 'secondary',
  completed: 'default',
  failed: 'destructive',
};

export function JobStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'outline'} className="capitalize">
      {status}
    </Badge>
  );
}
