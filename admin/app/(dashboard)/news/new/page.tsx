import { createNewsPost } from '@/app/actions/news';
import { NewsForm } from '@/components/news/news-form';

export default function NewNewsPostPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New post</h1>
        <p className="text-sm text-muted-foreground">Visible to any signed-in user once published.</p>
      </div>
      <NewsForm action={createNewsPost} />
    </div>
  );
}
