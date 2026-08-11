'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { approveScout, rejectScout } from '@/app/actions/scouts';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ApproveRejectForm({ scoutId, status }: { scoutId: string; status: string }) {
  const [notes, setNotes] = useState('');
  const [approving, startApprove] = useTransition();
  const [rejecting, startReject] = useTransition();
  const router = useRouter();
  const busy = approving || rejecting;

  if (status !== 'pending') {
    return (
      <p className="text-sm text-muted-foreground">
        This scout is already <span className="font-medium">{status}</span>. No action needed.
      </p>
    );
  }

  const onApprove = () => {
    startApprove(async () => {
      try {
        await approveScout(scoutId);
        toast.success('Scout approved.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not approve scout.');
      }
    });
  };

  const onReject = () => {
    if (!notes.trim()) {
      toast.error('Add a rejection reason first.');
      return;
    }
    startReject(async () => {
      try {
        await rejectScout(scoutId, notes.trim());
        toast.success('Scout rejected.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not reject scout.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decision</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onApprove} disabled={busy} className="w-full">
          {approving ? 'Approving…' : 'Approve'}
        </Button>
        <div className="space-y-2">
          <Label htmlFor="notes">Rejection reason</Label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={busy}
            className="min-h-20 w-full rounded-md border bg-transparent p-2 text-sm disabled:opacity-50"
            placeholder="Why is this being rejected? (shown to the scout)"
          />
          <Button onClick={onReject} disabled={busy} variant="destructive" className="w-full">
            {rejecting ? 'Rejecting…' : 'Reject'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
