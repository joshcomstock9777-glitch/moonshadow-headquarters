-- Private, project-linked intake storage for Headquarters.
-- Browser access remains limited to authenticated Headquarters members.

insert into storage.buckets (id, name, public, file_size_limit)
values ('hq-intake', 'hq-intake', false, 104857600)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "hq_read_intake_objects" on storage.objects;
create policy "hq_read_intake_objects"
on storage.objects for select
to authenticated
using (bucket_id = 'hq-intake' and public.has_headquarters_access());

drop policy if exists "hq_insert_intake_objects" on storage.objects;
create policy "hq_insert_intake_objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'hq-intake' and public.has_headquarters_access());

drop policy if exists "hq_delete_intake_objects" on storage.objects;
create policy "hq_delete_intake_objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'hq-intake' and public.has_headquarters_access());

