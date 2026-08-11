'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteNewsPost } from '@/app/actions/news';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

type Props = {
  action: (formData: FormData) => Promise<void>;
  initial?: { title: string; body: string; is_published: boolean };
  postId?: string;
};

export function NewsForm({ action, initial, postId }: Props) {
  const [deleting, startDelete] = useTransition();
  const router = useRouter();

  const onDelete = () => {
    if (!postId) return;
    if (!confirm('Delete this post permanently? This cannot be undone.')) return;
    startDelete(async () => {
      try {
        await deleteNewsPost(postId);
        toast.success('Post deleted.');
        router.push('/news');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not delete post.');
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={initial?.title} required maxLength={200} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <textarea
              id="body"
              name="body"
              defaultValue={initial?.body}
              required
              maxLength={5000}
              className="min-h-40 w-full rounded-md border bg-transparent p-2 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_published" defaultChecked={initial?.is_published ?? true} />
            Published (visible to signed-in users)
          </label>
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">
              {postId ? 'Save changes' : 'Create post'}
            </Button>
            {postId && (
              <Button type="button" variant="destructive" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
