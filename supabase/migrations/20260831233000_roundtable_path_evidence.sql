alter table public.roundtable_messages
  add column if not exists path_session_id text,
  add column if not exists path_correlation_id text,
  add column if not exists path_target text;

create index if not exists roundtable_messages_path_correlation_idx
  on public.roundtable_messages (path_correlation_id)
  where path_correlation_id is not null;

comment on column public.roundtable_messages.path_session_id is
  'Moonshadow Path session that produced this worker response. Null for creator/local rows.';
comment on column public.roundtable_messages.path_correlation_id is
  'Moonshadow Path correlation id used to trace the execution that produced this response.';
comment on column public.roundtable_messages.path_target is
  'Concrete Path worker target used for the request (for example allie or amber).';
