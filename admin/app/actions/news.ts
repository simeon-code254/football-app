'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin-guard';

export async function createNewsPost(formData: FormData) {
  await assertAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const isPublished = formData.get('is_published') === 'on';
  if (!title || !body) throw new Error('Title and body are required.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const { error } = await supabase
    .from('news_posts')
    .insert({ title, body, is_published: isPublished, author_id: user.id });
  if (error) throw error;

  revalidatePath('/news');
  redirect('/news');
}

export async function updateNewsPost(postId: string, formData: FormData) {
  await assertAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  const isPublished = formData.get('is_published') === 'on';
  if (!title || !body) throw new Error('Title and body are required.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('news_posts')
    .update({ title, body, is_published: isPublished })
    .eq('id', postId);
  if (error) throw error;

  revalidatePath('/news');
  revalidatePath(`/news/${postId}`);
  redirect('/news');
}

export async function deleteNewsPost(postId: string) {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from('news_posts').delete().eq('id', postId);
  if (error) throw error;

  revalidatePath('/news');
}
