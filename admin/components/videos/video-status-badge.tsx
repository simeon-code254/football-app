import { Badge } from '@/components/ui/badge';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  uploaded: 'outline',
  processing: 'secondary',
  ready: 'default',
  failed: 'destructive',
};

export function VideoStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'outline'} className="capitalize">
      {status}
    </Badge>
  );
}
