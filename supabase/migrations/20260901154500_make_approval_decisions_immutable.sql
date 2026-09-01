/*
  Make Headquarters approval evidence one-way and immutable.

  Browser-authenticated Headquarters roles may create pending approvals and
  decide them exactly once. They may not create pre-approved evidence, rewrite
  a decision after it has been made, or delete approval history. Trusted
  service-role maintenance remains available for controlled recovery.
*/

create or replace function public.enforce_approval_decision_integrity()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' or new.decided_at is not null then
      raise exception 'browser-created approvals must begin pending and undecided';
    end if;
    return new;
  end if;

  if old.status <> 'pending' or old.decided_at is not null then
    raise exception 'decided approval evidence is immutable';
  end if;

  if new.project_id is distinct from old.project_id
     or new.job_id is distinct from old.job_id
     or new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.category is distinct from old.category
     or new.created_at is distinct from old.created_at then
    raise exception 'approval identity and request evidence cannot change during decision';
  end if;

  if new.status not in ('approved', 'rejected') then
    raise exception 'pending approval may transition only to approved or rejected';
  end if;

  if new.decided_at is null then
    raise exception 'approval decision requires decided_at evidence';
  end if;

  return new;
end;
$$;

drop trigger if exists approvals_decision_integrity on public.approvals;
create trigger approvals_decision_integrity
before insert or update on public.approvals
for each row
execute function public.enforce_approval_decision_integrity();

-- Browser users may read/create/decide approvals through the trigger above,
-- but historical approval evidence may not be deleted from the control plane.
drop policy if exists "hq_delete_approvals" on public.approvals;

comment on function public.enforce_approval_decision_integrity() is
  'Fails closed on manufactured approval evidence: browser approvals start pending, may be decided exactly once with decided_at, and decided evidence is immutable.';
