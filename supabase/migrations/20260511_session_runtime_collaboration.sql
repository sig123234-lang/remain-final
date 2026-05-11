alter table public.sessions
  add column if not exists current_state jsonb not null default '{}'::jsonb,
  add column if not exists current_turn integer not null default 0,
  add column if not exists current_action text not null default 'continue',
  add column if not exists last_activity_at timestamptz not null default now();

alter table public.messages
  add column if not exists message_type text not null default 'utterance',
  add column if not exists source text not null default 'system',
  add column if not exists turn_index integer not null default 0,
  add column if not exists sequence_in_turn integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists is_final boolean not null default true;

create table if not exists public.session_recommendations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  based_on_message_id uuid references public.messages(id) on delete set null,
  question_text text not null,
  rationale text,
  target_emotion text,
  target_depth integer,
  target_memory text,
  risk_flag text,
  rank integer not null default 1,
  status text not null default 'suggested',
  created_by text not null default 'ai',
  selected_by text,
  sent_message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists session_recommendations_session_idx
  on public.session_recommendations(session_id, status, created_at desc);

create table if not exists public.session_commands (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  command_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  issued_by text not null,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists session_commands_session_idx
  on public.session_commands(session_id, status, created_at desc);

create unique index if not exists session_summaries_session_id_unique
  on public.session_summaries(session_id);

alter table public.sessions replica identity full;
alter table public.messages replica identity full;
alter table public.session_recommendations replica identity full;
alter table public.session_commands replica identity full;
alter table public.session_summaries replica identity full;
