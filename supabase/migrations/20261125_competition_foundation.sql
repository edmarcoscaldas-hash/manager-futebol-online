-- Estrutura base para copas nacionais, torneios continentais e seleções.
-- Jogos nacionais existentes permanecem inalterados; competition_season_id nulo indica liga tradicional.
create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  competition_type text not null check (competition_type in ('national_cup','continental_club','intercontinental_club','national_team_qualifier','national_team_tournament')),
  region text,
  country text,
  format text not null default 'knockout' check (format in ('league','knockout','group_knockout','qualifier')),
  cycle_years integer not null default 1 check (cycle_years >= 1),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_seasons (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  season_number integer not null,
  display_name text not null,
  starts_on date,
  ends_on date,
  status text not null default 'planned' check (status in ('planned','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique (competition_id, season_number),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table if not exists public.competition_participants (
  id uuid primary key default gen_random_uuid(),
  competition_season_id uuid not null references public.competition_seasons(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  seed integer,
  group_code text,
  qualified_by text,
  created_at timestamptz not null default now(),
  unique (competition_season_id, club_id),
  check (seed is null or seed > 0)
);

alter table public.matches
  add column if not exists competition_season_id uuid references public.competition_seasons(id) on delete set null,
  add column if not exists phase text,
  add column if not exists group_code text,
  add column if not exists tie_code text,
  add column if not exists leg_number integer,
  add column if not exists bracket_position integer;

alter table public.matches
  add constraint matches_leg_number_positive check (leg_number is null or leg_number > 0),
  add constraint matches_bracket_position_positive check (bracket_position is null or bracket_position > 0);

create index if not exists idx_matches_competition_round
  on public.matches (competition_season_id, phase, round_number, match_date);
create index if not exists idx_competition_participants_club
  on public.competition_participants (club_id, competition_season_id);

alter table public.competitions enable row level security;
alter table public.competition_seasons enable row level security;
alter table public.competition_participants enable row level security;

drop policy if exists competitions_read_authenticated on public.competitions;
create policy competitions_read_authenticated on public.competitions
  for select to authenticated using (true);
drop policy if exists competition_seasons_read_authenticated on public.competition_seasons;
create policy competition_seasons_read_authenticated on public.competition_seasons
  for select to authenticated using (true);
drop policy if exists competition_participants_read_authenticated on public.competition_participants;
create policy competition_participants_read_authenticated on public.competition_participants
  for select to authenticated using (true);

grant select on public.competitions, public.competition_seasons, public.competition_participants to authenticated;
