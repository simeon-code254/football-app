'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { requeueJob } from '@/app/actions/jobs';
import { Button } from '@/components/ui/button';

export function RequeueButton({ jobId }: { jobId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onClick = () => {
    startTransition(async () => {
      try {
        await requeueJob(jobId);
        toast.success('Job requeued. ai-service will pick it up on its next poll (≤2 min).');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not requeue job.');
      }
    });
  };

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={pending}>
      {pending ? 'Requeuing…' : 'Requeue'}
    </Button>
  );
}
