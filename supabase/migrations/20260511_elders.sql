create table if not exists public.elders (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  display_name text,
  age integer,
  birth_year integer,
  gender text,
  facility_name text,
  diagnosis text,
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists elders_active_created_idx
  on public.elders(is_active, created_at desc);

alter table public.elders replica identity full;
