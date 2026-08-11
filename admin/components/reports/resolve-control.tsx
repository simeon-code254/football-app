'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resolveReport } from '@/app/actions/moderation';
import { Button } from '@/components/ui/button';

export function ResolveControl({ reportId }: { reportId: string }) {
  const [notes, setNotes] = useState('');
  const [resolving, startResolve] = useTransition();
  const [dismissing, startDismiss] = useTransition();
  const router = useRouter();
  const busy = resolving || dismissing;

  const act = (status: 'resolved' | 'dismissed', start: typeof startResolve) => {
    start(async () => {
      try {
        await resolveReport(reportId, status, notes.trim() || undefined);
        toast.success(status === 'resolved' ? 'Report resolved.' : 'Report dismissed.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not update report.');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={busy}
        placeholder="Notes (optional)"
        className="h-8 w-40 rounded-md border bg-transparent px-2 text-xs disabled:opacity-50"
      />
      <Button size="sm" variant="outline" disabled={busy} onClick={() => act('resolved', startResolve)}>
        {resolving ? 'Resolving…' : 'Resolve'}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => act('dismissed', startDismiss)}>
        {dismissing ? 'Dismissing…' : 'Dismiss'}
      </Button>
    </div>
  );
}
