-- applications_update_scout (20260808080215_trial_applications.sql) let a
-- scout set status to ANY of the 5 values, including 'withdrawn' -- which
-- the schema's own design (and the paired player policy's `with check
-- (status = 'withdrawn')`) treats as player-exclusive. Scouts manage
-- pending/shortlisted/accepted/rejected only.
drop policy applications_update_scout on public.trial_applications;

create policy applications_update_scout on public.trial_applications for update
  using (exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid()))
  with check (
    exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid())
    and status in ('pending', 'shortlisted', 'accepted', 'rejected')
  );
