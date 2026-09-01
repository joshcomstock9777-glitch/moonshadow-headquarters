-- Preserve Headquarters asset provenance.
-- Asset rows represent immutable originals/revisions. Browser-authenticated
-- Headquarters clients may read existing assets and insert a new revision, but
-- they must not rewrite or delete prior provenance after it has been recorded.
-- Trusted service-role maintenance remains available because service-role
-- requests bypass RLS.

alter table public.assets enable row level security;

-- Remove policies that may have been created by earlier broad CRUD migrations.
drop policy if exists "anon_update_assets" on public.assets;
drop policy if exists "anon_delete_assets" on public.assets;
drop policy if exists "authenticated_update_assets" on public.assets;
drop policy if exists "authenticated_delete_assets" on public.assets;
drop policy if exists "hq_update_assets" on public.assets;
drop policy if exists "hq_delete_assets" on public.assets;

-- Keep authorized browser reads and new immutable revision inserts explicit.
drop policy if exists "hq_select_assets" on public.assets;
create policy "hq_select_assets"
on public.assets
for select
to authenticated
using (public.has_headquarters_access());

drop policy if exists "hq_insert_assets" on public.assets;
create policy "hq_insert_assets"
on public.assets
for insert
to authenticated
with check (public.has_headquarters_access());

comment on table public.assets is
  'Immutable Headquarters asset/provenance records. Browser HQ roles may select and insert new revisions; existing rows are not updateable/deletable from the browser control plane.';
