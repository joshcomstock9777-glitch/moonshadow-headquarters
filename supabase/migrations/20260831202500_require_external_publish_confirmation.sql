-- Headquarters publishing integrity boundary.
-- A browser/authenticated client may queue and approve work, but it may not
-- manufacture proof that an external destination accepted a publication.
-- Only a trusted server path using the Supabase service role may transition a
-- publish item into the `published` state or assign `published_at`.

create or replace function public.enforce_external_publish_confirmation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if new.status = 'published'
      and (tg_op = 'INSERT' or old.status is distinct from 'published') then
      raise exception 'published status requires trusted external publication confirmation';
    end if;

    if new.published_at is not null
      and (tg_op = 'INSERT' or old.published_at is distinct from new.published_at) then
      raise exception 'published_at requires trusted external publication confirmation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists publish_items_external_confirmation on public.publish_items;
create trigger publish_items_external_confirmation
before insert or update on public.publish_items
for each row
execute function public.enforce_external_publish_confirmation();

comment on function public.enforce_external_publish_confirmation() is
  'Prevents browser/authenticated clients from claiming a publish succeeded. A trusted server-side publisher must confirm the external platform response before setting published/published_at.';
