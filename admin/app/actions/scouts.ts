'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin-guard';

export async function approveScout(scoutId: string) {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from('scouts')
    .update({ verification_status: 'verified' })
    .eq('id', scoutId);
  if (error) throw error;

  revalidatePath('/scout-verification');
  revalidatePath(`/scout-verification/${scoutId}`);
}

export async function rejectScout(scoutId: string, notes: string) {
  await assertAdmin();
  if (!notes.trim()) throw new Error('A rejection reason is required.');

  const supabase = await createClient();
  const { error } = await supabase
    .from('scouts')
    .update({ verification_status: 'rejected', verification_notes: notes.trim() })
    .eq('id', scoutId);
  if (error) throw error;

  revalidatePath('/scout-verification');
  revalidatePath(`/scout-verification/${scoutId}`);
}
