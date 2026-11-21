-- MFO: rastreabilidade e staging seguro para importacao de clubes/jogadores reais.
-- Migracao aditiva: nao altera nem remove registros, IDs, partidas ou elencos existentes.

alter table public.clubs
  add column if not exists external_provider text,
  add column if not exists external_id text,
  add column if not exists data_origem text not null default 'legacy';

alter table public.players
  add column if not exists external_provider text,
  add column if not exists external_id text,
  add column if not exists data_origem text not null default 'legacy';

alter table public.clubs
  add constraint clubs_data_origem_check
  check (data_origem in ('legacy','api_football','manual','fictional'))
  not valid;

alter table public.players
  add constraint players_data_origem_check
  check (data_origem in ('legacy','api_football','manual','fictional'))
  not valid;

alter table public.clubs validate constraint clubs_data_origem_check;
alter table public.players validate constraint players_data_origem_check;

create unique index if not exists clubs_external_identity_uidx
  on public.clubs (external_provider, external_id)
  where external_provider is not null and external_id is not null;

create unique index if not exists players_external_identity_uidx
  on public.players (external_provider, external_id)
  where external_provider is not null and external_id is not null;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.football_import_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  status text not null default 'staging'
    check (status in ('staging','validated','applied','failed','cancelled')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  error_message text
);

create table if not exists private.football_import_teams (
  id bigint generated always as identity primary key,
  run_id uuid not null references private.football_import_runs(id) on delete cascade,
  external_id text not null,
  country text,
  competition text,
  team_name text not null,
  payload jsonb not null,
  matched_club_id uuid references public.clubs(id) on delete set null,
  review_status text not null default 'pending'
    check (review_status in ('pending','matched','new','ignored','conflict')),
  unique (run_id, external_id)
);

create table if not exists private.football_import_players (
  id bigint generated always as identity primary key,
  run_id uuid not null references private.football_import_runs(id) on delete cascade,
  external_player_id text not null,
  external_team_id text,
  player_name text not null,
  payload jsonb not null,
  matched_player_id uuid references public.players(id) on delete set null,
  review_status text not null default 'pending'
    check (review_status in ('pending','matched','new','ignored','conflict')),
  unique (run_id, external_player_id, external_team_id)
);

create index if not exists football_import_teams_run_status_idx
  on private.football_import_teams(run_id, review_status);
create index if not exists football_import_players_run_status_idx
  on private.football_import_players(run_id, review_status);

grant select, insert, update, delete on all tables in schema private to service_role;
grant usage, select on all sequences in schema private to service_role;

comment on column public.clubs.data_origem is
  'Origem do cadastro: legacy (registro anterior), api_football, manual ou fictional.';
comment on column public.players.data_origem is
  'Origem do cadastro: legacy (registro anterior), api_football, manual ou fictional.';
comment on table private.football_import_runs is
  'Execucoes de importacao staged; nao publica dados diretamente no jogo.';
