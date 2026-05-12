-- Align older databases: display_name may be missing if elders predates 20260511_elders.sql.
alter table public.elders
  add column if not exists display_name text;

-- Ensure the default elder id used by REMAIN_DEFAULT_ELDER_ID exists so
-- talk-flow sessions/messages can satisfy the FK on elder_id.
--
-- The deployed schema diverged from the local migration: production elders use
-- `name` instead of `full_name`. We branch on which column exists so the
-- migration is safe to re-apply on either shape.
do $$
declare
  default_elder_id constant uuid := '8dc55e51-7b82-4e4b-8331-1b6824ed153f';
  has_full_name boolean;
  has_name boolean;
  has_is_active boolean;
  has_updated_at boolean;
begin
  if exists (select 1 from public.elders where id = default_elder_id) then
    -- Already there (e.g. production). Just backfill display_name if blank.
    update public.elders
      set display_name = coalesce(display_name, '기본 어르신')
      where id = default_elder_id;
    return;
  end if;

  select count(*) > 0 into has_full_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'elders'
      and column_name = 'full_name';

  select count(*) > 0 into has_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'elders'
      and column_name = 'name';

  select count(*) > 0 into has_is_active
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'elders'
      and column_name = 'is_active';

  select count(*) > 0 into has_updated_at
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'elders'
      and column_name = 'updated_at';

  if has_full_name then
    execute format(
      'insert into public.elders (id, full_name, display_name%s%s) values ($1, $2, $3%s%s)',
      case when has_is_active then ', is_active' else '' end,
      case when has_updated_at then ', updated_at' else '' end,
      case when has_is_active then ', true' else '' end,
      case when has_updated_at then ', now()' else '' end
    ) using default_elder_id, '기본 어르신', '기본 어르신';
  elsif has_name then
    execute 'insert into public.elders (id, name, display_name) values ($1, $2, $3)'
      using default_elder_id, '기본 어르신', '기본 어르신';
  end if;
end $$;
