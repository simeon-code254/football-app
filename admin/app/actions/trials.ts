'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { assertAdmin } from '@/lib/admin-guard';

export async function createAdminTrial(formData: FormData) {
  await assertAdmin();

  const title = String(formData.get('title') ?? '').trim();
  const club = String(formData.get('club') ?? '').trim();
  const location = String(formData.get('location') ?? '').trim();
  const trialDate = String(formData.get('trial_date') ?? '');
  const applicationDeadline = String(formData.get('application_deadline') ?? '');
  const description = String(formData.get('description') ?? '').trim();
  const ageMin = formData.get('age_min') ? Number(formData.get('age_min')) : null;
  const ageMax = formData.get('age_max') ? Number(formData.get('age_max')) : null;
  const positions = formData.getAll('positions') as string[];

  if (!title || !club || !location || !trialDate || !applicationDeadline) {
    throw new Error('Title, club, location, trial date, and application deadline are required.');
  }

  const supabase = await createClient();
  const { error } = await supabase.from('trials').insert({
    scout_id: null,
    title,
    club,
    location,
    trial_date: trialDate,
    application_deadline: applicationDeadline,
    description: description || null,
    age_min: ageMin,
    age_max: ageMax,
    positions: positions as never,
  });
  if (error) throw error;

  revalidatePath('/trials');
  redirect('/trials');
}

export async function updateTrialStatus(trialId: string, status: 'open' | 'closed' | 'cancelled') {
  await assertAdmin();

  const supabase = await createClient();
  const { error } = await supabase.from('trials').update({ status }).eq('id', trialId);
  if (error) throw error;

  revalidatePath('/trials');
  revalidatePath(`/trials/${trialId}`);
}
