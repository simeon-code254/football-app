-- Scout verification currently only looks at scouts.organization (free
-- text) — nothing an admin could actually check against before approving.
-- Adds the documents a scout submits for review (ID, proof of organization/
-- club affiliation, optional certification) plus a private bucket to hold
-- the files, and an admin-writable field to explain a rejection.

create table public.scout_verification_documents (
  id uuid primary key default gen_random_uuid(),
  scout_id uuid not null references public.scouts(id) on delete cascade,
  document_type text not null check (document_type in ('id_document','proof_of_organization','certification','other')),
  storage_path text not null,
  file_name text,
  submitted_at timestamptz not null default now()
);

alter table public.scouts
  add column verification_notes text; -- admin-writable: reason for rejection / what's missing

alter table public.scout_verification_documents enable row level security;

-- Owning scout manages their own submissions; admin reviews (read-only —
-- admins approve/reject via scouts.verification_status, they don't edit a
-- scout's uploaded files).
create policy verification_documents_owner on public.scout_verification_documents for all
  using (scout_id = auth.uid()) with check (scout_id = auth.uid());
create policy verification_documents_admin_select on public.scout_verification_documents for select
  using (public.is_admin());

-- Private bucket: path convention {scout_id}/{filename}. Owner + admin only
-- — these are identity/affiliation documents, never public.
insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy verification_docs_owner_all on storage.objects for all to authenticated
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verification_docs_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and public.is_admin());
