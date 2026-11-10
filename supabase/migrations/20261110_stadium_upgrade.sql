-- MFO: campos para evolução do estádio
-- Execute no Supabase > SQL Editor > New query
alter table public.clubs
  add column if not exists stadium_level integer not null default 1,
  add column if not exists stadium_target_capacity integer,
  add column if not exists stadium_upgrade_started_at timestamptz,
  add column if not exists stadium_upgrade_finishes_at timestamptz;

-- Padroniza clubes já criados com capacidade inicial mínima de 10 mil lugares.
update public.clubs
set capacidade = 10000,
    stadium_level = 1
where capacidade is null or capacidade < 10000;
