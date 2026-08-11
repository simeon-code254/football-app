'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin-guard';

// Only ever failed -> queued (RLS's jobs_requeue_admin policy enforces this
// server-side too). ai-service's poll_loop picks this up on its next sweep
// (default 120s) -- its realtime listener only subscribes to INSERT, not
// UPDATE, so this is not instant.
export async function requeueJob(jobId: string) {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from('video_analysis_jobs')
    .update({ status: 'queued' })
    .eq('id', jobId)
    .eq('status', 'failed');
  if (error) throw error;

  revalidatePath('/ai-pipeline');
}
