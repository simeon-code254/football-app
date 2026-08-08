-- The scout-invite insert policy implicitly required verification (only a
-- verified scout could have created the trial being invited from), but a
-- scout later demoted to 'rejected' could still invite players to trials
-- they created while verified. Require current verification explicitly,
-- matching trial creation and messaging.

drop policy if exists applications_insert_scout_invite on public.trial_applications;
create policy applications_insert_scout_invite on public.trial_applications for insert
  with check (
    source = 'invited'
    and invited_by_scout_id = auth.uid()
    and public.is_verified_scout()
    and exists (select 1 from public.trials t where t.id = trial_id and t.scout_id = auth.uid())
  );
