'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateTrialStatus } from '@/app/actions/trials';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const NEXT_STATUS: Record<string, { label: string; status: 'open' | 'closed' | 'cancelled'; variant: 'outline' | 'destructive' }[]> = {
  open: [
    { label: 'Close', status: 'closed', variant: 'outline' },
    { label: 'Cancel', status: 'cancelled', variant: 'destructive' },
  ],
  closed: [{ label: 'Reopen', status: 'open', variant: 'outline' }],
  cancelled: [{ label: 'Reopen', status: 'open', variant: 'outline' }],
};

export function TrialStatusControl({ trialId, status }: { trialId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const actions = NEXT_STATUS[status] ?? [];
  if (!actions.length) return null;

  const onChange = (newStatus: 'open' | 'closed' | 'cancelled') => {
    startTransition(async () => {
      try {
        await updateTrialStatus(trialId, newStatus);
        toast.success(`Trial marked ${newStatus}.`);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not update trial.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manage</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        {actions.map((a) => (
          <Button key={a.status} variant={a.variant} disabled={pending} onClick={() => onChange(a.status)}>
            {a.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
