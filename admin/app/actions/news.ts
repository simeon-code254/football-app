'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin-guard';
import { uploadCoverImage } from '@/lib/coverImage';
import type { Database } from '@/lib/supabase/database.types';

type NewsPostUpdate = Database['public']['Tables']['news_posts']['Update'];

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

  const coverImage = formData.get('cover_image');
  const coverImagePath = coverImage instanceof File && coverImage.size > 0 ? await uploadCoverImage(supabase, 'news', coverImage) : null;

  const { error } = await supabase
    .from('news_posts')
    .insert({ title, body, is_published: isPublished, author_id: user.id, cover_image_path: coverImagePath });
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
  const coverImage = formData.get('cover_image');
  // Only touches cover_image_path when a new file was actually picked --
  // leaving the field untouched on every edit would mean re-uploading is the
  // only way to keep an existing cover image.
  const update: NewsPostUpdate = { title, body, is_published: isPublished };
  if (coverImage instanceof File && coverImage.size > 0) {
    update.cover_image_path = await uploadCoverImage(supabase, 'news', coverImage);
  }

  const { error } = await supabase.from('news_posts').update(update).eq('id', postId);
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
