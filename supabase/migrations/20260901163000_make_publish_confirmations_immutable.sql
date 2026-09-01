-- Preserve trusted external publication evidence once it exists.
-- Browser-authenticated Headquarters users may prepare and update unpublished
-- queue items, but they may not rewrite or delete a row after a trusted server
-- publisher has confirmed it as published.

create or replace function public.enforce_immutable_publish_confirmation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    if tg_op = 'UPDATE' and old.status = 'published' then
      raise exception 'published confirmation evidence is immutable';
    end if;

    if tg_op = 'DELETE' and old.status = 'published' then
      raise exception 'published confirmation evidence is immutable';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists publish_items_immutable_confirmation on public.publish_items;
create trigger publish_items_immutable_confirmation
before update or delete on public.publish_items
for each row
execute function public.enforce_immutable_publish_confirmation();

comment on function public.enforce_immutable_publish_confirmation() is
  'Prevents browser/authenticated clients from rewriting or deleting trusted external publication confirmation after a publish item has reached published status. Service-role recovery remains available.';
