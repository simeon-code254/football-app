import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateNewsPost } from '@/app/actions/news';
import { NewsForm } from '@/components/news/news-form';
import { coverImagePublicUrl } from '@/lib/coverImage';

export default async function EditNewsPostPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: post } = await supabase.from('news_posts').select('*').eq('id', params.id).single();
  if (!post) notFound();

  const action = updateNewsPost.bind(null, post.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit post</h1>
        <p className="text-sm text-muted-foreground">
          Published {new Date(post.published_at).toLocaleDateString()}.
        </p>
      </div>
      <NewsForm
        action={action}
        initial={{
          title: post.title,
          body: post.body,
          is_published: post.is_published,
          cover_image_url: coverImagePublicUrl(supabase, post.cover_image_path),
        }}
        postId={post.id}
      />
    </div>
  );
}
