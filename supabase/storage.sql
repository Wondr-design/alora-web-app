-- Run this in Supabase SQL Editor (or psql) once per project.
-- It creates a private documents bucket and policies for authenticated access.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760,
  array[
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

create policy "documents_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'documents' and owner = auth.uid());

create policy "documents_insert_own"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'documents' and owner = auth.uid());

create policy "documents_update_own"
on storage.objects
for update
to authenticated
using (bucket_id = 'documents' and owner = auth.uid());

create policy "documents_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'documents' and owner = auth.uid());
