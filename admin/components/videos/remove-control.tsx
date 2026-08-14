'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { removeVideo, restoreVideo } from '@/app/actions/moderation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type Props = {
  videoId: string;
  isRemoved: boolean;
  removedReason: string | null;
  removedAt: string | null;
};

export function RemoveControl({ videoId, isRemoved, removedReason, removedAt }: Props) {
  const [reason, setReason] = useState('');
  const [removing, startRemove] = useTransition();
  const [restoring, startRestore] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();
  const busy = removing || restoring;

  const onRemove = () => {
    startRemove(async () => {
      try {
        await removeVideo(videoId, reason.trim());
        toast.success('Video removed.');
        setConfirmOpen(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not remove video.');
      }
    });
  };

  const requestRemove = () => {
    if (!reason.trim()) {
      toast.error('Add a removal reason first.');
      return;
    }
    setConfirmOpen(true);
  };

  const onRestore = () => {
    startRestore(async () => {
      try {
        await restoreVideo(videoId);
        toast.success('Video restored.');
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not restore video.');
      }
    });
  };

  if (isRemoved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-destructive">Removed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {removedReason && (
            <div>
              <span className="text-muted-foreground">Reason: </span>
              {removedReason}
            </div>
          )}
          {removedAt && (
            <div>
              <span className="text-muted-foreground">Since: </span>
              {new Date(removedAt).toLocaleString()}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Hidden from everyone except the uploader and admins -- the source file and thumbnail are no longer
            fetchable via signed URL either.
          </p>
          <Button onClick={onRestore} disabled={busy} variant="outline" className="w-full">
            {restoring ? 'Restoring…' : 'Restore'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Remove video</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          className="min-h-16 w-full rounded-md border bg-transparent p-2 text-sm disabled:opacity-50"
          placeholder="Why is this video being removed?"
        />
        <Button onClick={requestRemove} disabled={busy} variant="destructive" className="w-full">
          {removing ? 'Removing…' : 'Remove'}
        </Button>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remove this video?"
        description="It will be hidden from everyone except the uploader and admins."
        confirmLabel="Remove"
        pendingLabel="Removing…"
        destructive
        pending={removing}
        onConfirm={onRemove}
      />
    </Card>
  );
}
