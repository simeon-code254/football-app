'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { suspendProfile, reactivateProfile } from '@/app/actions/moderation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  profileId: string;
  isActive: boolean;
  suspendedReason: string | null;
  suspendedAt: string | null;
};

export function SuspendControl({ profileId, isActive, suspendedReason, suspendedAt }: Props) {
  const [reason, setReason] = useState('');
  const [suspending, startSuspend] = useTransition();
  const [reactivating, startReactivate] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const busy = suspending || reactivating;

  const onSuspend = () => {
    startSuspend(async () => {
      try {
        await suspendProfile(profileId, reason.trim());
        toast.success('Account suspended.');
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not suspend account.');
      }
    });
  };

  const requestSuspend = () => {
    if (!reason.trim()) {
      toast.error('Add a suspension reason first.');
      return;
    }
    setConfirmOpen(true);
  };

  const onReactivate = () => {
    startReactivate(async () => {
      try {
        await reactivateProfile(profileId);
        toast.success('Account reactivated.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not reactivate account.');
      }
    });
  };

  if (!isActive) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Suspended</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {suspendedReason && (
            <div>
              <span className="text-muted-foreground">Reason: </span>
              {suspendedReason}
            </div>
          )}
          {suspendedAt && (
            <div>
              <span className="text-muted-foreground">Since: </span>
              {new Date(suspendedAt).toLocaleString()}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            This hides the account from Discover/browse immediately. It does not yet block the account&apos;s own
            writes (upload/message/apply) -- that needs mobile-app enforcement, not built yet.
          </p>
          <Button onClick={onReactivate} disabled={busy} variant="outline" className="w-full">
            {reactivating ? 'Reactivating…' : 'Reactivate'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Suspend account</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          className="min-h-16 w-full rounded-md border bg-transparent p-2 text-sm disabled:opacity-50"
          placeholder="Why is this account being suspended?"
        />
        <Button onClick={requestSuspend} disabled={busy} variant="destructive" className="w-full">
          {suspending ? 'Suspending…' : 'Suspend'}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Suspend this account?"
        description="They'll be hidden from Discover/browse immediately and can be reactivated later."
        confirmLabel="Suspend"
        pendingLabel="Suspending…"
        destructive
        pending={suspending}
        onConfirm={onSuspend}
      />
    </Card>
  );
}
