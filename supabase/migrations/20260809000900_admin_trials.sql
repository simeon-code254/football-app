-- Admin-posted trials, distinct from a scout's own trials (scout_id stays
-- required for those, enforced by trials_insert_own_verified unchanged
-- below). scout_id becomes nullable so an admin-authored trial can exist
-- with no owning scout -- confirmed safe: no mobile screen dereferences
-- trial.scouts.* without optional chaining (grepped app/app/trial/[id].tsx
-- and both trials.tsx screens; neither reads scout data off a trial row at
-- all today), so this doesn't risk a null-pointer crash on mobile.
alter table public.trials alter column scout_id drop not null;

create policy trials_insert_admin on public.trials for insert
  with check (public.is_admin() and scout_id is null);
create policy trials_update_admin on public.trials for update
  using (public.is_admin()) with check (public.is_admin());
create policy trials_delete_admin on public.trials for delete
  using (public.is_admin());
