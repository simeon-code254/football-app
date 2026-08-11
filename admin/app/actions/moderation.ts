'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin-guard';

export async function suspendProfile(profileId: string, reason: string) {
  await assertAdmin();
  if (!reason.trim()) throw new Error('A suspension reason is required.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: false, suspended_reason: reason.trim() })
    .eq('id', profileId);
  if (error) throw error;

  revalidatePath('/users');
  revalidatePath(`/users/${profileId}`);
}

export async function reactivateProfile(profileId: string) {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ is_active: true }).eq('id', profileId);
  if (error) throw error;

  revalidatePath('/users');
  revalidatePath(`/users/${profileId}`);
}

export async function removeVideo(videoId: string, reason: string) {
  await assertAdmin();
  if (!reason.trim()) throw new Error('A removal reason is required.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('videos')
    .update({ is_removed: true, removed_reason: reason.trim() })
    .eq('id', videoId);
  if (error) throw error;

  revalidatePath('/videos');
  revalidatePath(`/videos/${videoId}`);
}

export async function restoreVideo(videoId: string) {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from('videos').update({ is_removed: false }).eq('id', videoId);
  if (error) throw error;

  revalidatePath('/videos');
  revalidatePath(`/videos/${videoId}`);
}

export async function resolveReport(reportId: string, status: 'resolved' | 'dismissed', adminNotes?: string) {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from('reports')
    .update({ status, admin_notes: adminNotes?.trim() || null })
    .eq('id', reportId);
  if (error) throw error;

  revalidatePath('/reports');
}
