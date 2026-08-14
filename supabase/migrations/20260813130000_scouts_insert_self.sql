-- scouts had SELECT and UPDATE policies but no INSERT policy at all --
-- harmless for signup (handle_new_user()'s trigger is SECURITY DEFINER,
-- bypassing RLS entirely) but a real gap for profileRepository.updateScout(),
-- which uses .upsert({id, ...patch}, {onConflict:'id'}). PostgREST upsert
-- compiles to INSERT ... ON CONFLICT DO UPDATE, and Postgres checks the
-- INSERT-path RLS regardless of whether a conflict actually occurs -- with
-- zero INSERT policies, every upsert was rejected outright (403), even for
-- a scout editing their own already-existing row. scout-edit-profile.tsx's
-- Save Changes has been broken since this table was created.
create policy scouts_insert_self on public.scouts for insert
  with check (auth.uid() = id);
