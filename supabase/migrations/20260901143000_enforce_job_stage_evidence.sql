/*
  Enforce evidence-backed Headquarters job stage transitions.

  Browser-authenticated Headquarters operators may edit production fields and
  advance work one stage at a time, but they may not manufacture approval,
  publication, or completion state by directly updating jobs.stage.

  Trusted service-role maintenance may reconcile state when necessary.
*/

create or replace function public.enforce_job_stage_evidence()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  stages constant text[] := array[
    'idea', 'plan', 'create', 'review', 'edit', 'package', 'approve', 'publish', 'done'
  ];
  old_index integer;
  new_index integer;
  has_approval boolean;
  has_publication boolean;
begin
  if new.stage is null or not (new.stage = any(stages)) then
    raise exception 'invalid Headquarters job stage: %', coalesce(new.stage, '<null>');
  end if;

  if tg_op = 'INSERT' then
    if auth.role() is distinct from 'service_role' and new.stage <> 'idea' then
      raise exception 'new browser-created jobs must begin at idea stage';
    end if;
    return new;
  end if;

  if old.stage is not distinct from new.stage then
    return new;
  end if;

  old_index := array_position(stages, old.stage);
  new_index := array_position(stages, new.stage);

  if old_index is null then
    raise exception 'existing job has unknown stage: %', old.stage;
  end if;

  if auth.role() is distinct from 'service_role' then
    if new_index <> old_index + 1 then
      raise exception 'browser job transitions must advance exactly one stage (% -> % rejected)', old.stage, new.stage;
    end if;

    if new.stage = 'publish' then
      select exists (
        select 1
        from public.approvals a
        where a.job_id = new.id
          and a.status = 'approved'
          and a.decided_at is not null
      ) into has_approval;

      if not has_approval then
        raise exception 'publish stage requires recorded approved approval evidence';
      end if;
    end if;

    if new.stage = 'done' then
      select exists (
        select 1
        from public.publish_items p
        where p.job_id = new.id
          and p.status = 'published'
          and p.published_at is not null
      ) into has_publication;

      if not has_publication then
        raise exception 'done stage requires trusted external publication confirmation';
      end if;
    end if;
  end if;

  insert into public.activity (
    project_id,
    job_id,
    actor,
    action,
    category,
    detail
  ) values (
    new.project_id,
    new.id,
    'Headquarters control plane',
    format('advanced job from %s to %s', old.stage, new.stage),
    'system',
    case
      when new.stage = 'publish' then 'Approval evidence verified before publish stage.'
      when new.stage = 'done' then 'External publication evidence verified before completion.'
      else 'Sequential stage transition recorded by database trigger.'
    end
  );

  return new;
end;
$$;

drop trigger if exists jobs_stage_evidence on public.jobs;
create trigger jobs_stage_evidence
before insert or update of stage on public.jobs
for each row
execute function public.enforce_job_stage_evidence();

comment on function public.enforce_job_stage_evidence() is
  'Fails closed on browser-manufactured job state: sequential transitions only, approval required before publish, and trusted publication confirmation required before done; stage changes are audited atomically.';
