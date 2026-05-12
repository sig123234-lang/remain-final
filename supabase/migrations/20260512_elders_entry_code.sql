alter table public.elders
  add column if not exists entry_code text;

with ordered_elders as (
  select
    id,
    'RM' ||
    lpad(
      row_number() over (
        order by created_at, id
      )::text,
      6,
      '0'
    ) as generated_code
  from public.elders
  where entry_code is null
     or btrim(entry_code) = ''
)
update public.elders as elders
set entry_code = ordered_elders.generated_code
from ordered_elders
where elders.id = ordered_elders.id;

create unique index if not exists elders_entry_code_key
  on public.elders(entry_code)
  where entry_code is not null;
