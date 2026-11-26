-- Base de seleções: separa elenco e partidas internacionais dos clubes.
create table if not exists public.national_teams (
  id uuid primary key default gen_random_uuid(),
  country text not null unique,
  name text not null,
  confederation text not null check (confederation in ('AFC','CAF','CONCACAF','CONMEBOL','OFC','UEFA')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.competition_participants
  alter column club_id drop not null,
  add column if not exists national_team_id uuid references public.national_teams(id) on delete cascade;

alter table public.competition_participants
  add constraint competition_participant_one_entity
  check ((club_id is not null and national_team_id is null) or (club_id is null and national_team_id is not null));

create unique index if not exists idx_competition_participants_national_team
  on public.competition_participants (competition_season_id,national_team_id)
  where national_team_id is not null;

create table if not exists public.national_team_squads (
  id uuid primary key default gen_random_uuid(),
  competition_season_id uuid not null references public.competition_seasons(id) on delete cascade,
  national_team_id uuid not null references public.national_teams(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  squad_role text not null default 'selected' check (squad_role in ('selected','starter','reserve')),
  created_at timestamptz not null default now(),
  unique (competition_season_id,national_team_id,player_id)
);

create table if not exists public.national_team_matches (
  id uuid primary key default gen_random_uuid(),
  competition_season_id uuid not null references public.competition_seasons(id) on delete cascade,
  round_number integer not null check (round_number > 0),
  match_date timestamptz,
  home_national_team_id uuid not null references public.national_teams(id),
  away_national_team_id uuid not null references public.national_teams(id),
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','cancelled')),
  phase text,
  group_code text,
  tie_code text,
  leg_number integer check (leg_number is null or leg_number > 0),
  bracket_position integer check (bracket_position is null or bracket_position > 0),
  played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_national_team_id <> away_national_team_id),
  check (status <> 'finished' or (home_score is not null and away_score is not null))
);

create index if not exists idx_national_team_matches_competition
  on public.national_team_matches (competition_season_id,phase,round_number,match_date);

alter table public.national_teams enable row level security;
alter table public.national_team_squads enable row level security;
alter table public.national_team_matches enable row level security;

drop policy if exists national_teams_read_authenticated on public.national_teams;
create policy national_teams_read_authenticated on public.national_teams for select to authenticated using (true);
drop policy if exists national_team_squads_read_authenticated on public.national_team_squads;
create policy national_team_squads_read_authenticated on public.national_team_squads for select to authenticated using (true);
drop policy if exists national_team_matches_read_authenticated on public.national_team_matches;
create policy national_team_matches_read_authenticated on public.national_team_matches for select to authenticated using (true);

grant select on public.national_teams,public.national_team_squads,public.national_team_matches to authenticated;

insert into public.national_teams (country,name,confederation)
values
 ('África do Sul','Seleção da África do Sul','CAF'),
 ('Alemanha','Seleção da Alemanha','UEFA'),
 ('Arábia Saudita','Seleção da Arábia Saudita','AFC'),
 ('Argentina','Seleção da Argentina','CONMEBOL'),
 ('Austrália','Seleção da Austrália','AFC'),
 ('Brasil','Seleção Brasileira','CONMEBOL'),
 ('Coreia do Sul','Seleção da Coreia do Sul','AFC'),
 ('Egito','Seleção do Egito','CAF'),
 ('Emirados Árabes Unidos','Seleção dos Emirados Árabes Unidos','AFC'),
 ('Espanha','Seleção da Espanha','UEFA'),
 ('França','Seleção da França','UEFA'),
 ('Holanda','Seleção da Holanda','UEFA'),
 ('Inglaterra','Seleção da Inglaterra','UEFA'),
 ('Itália','Seleção da Itália','UEFA'),
 ('Japão','Seleção do Japão','AFC'),
 ('Marrocos','Seleção do Marrocos','CAF'),
 ('México','Seleção do México','CONCACAF'),
 ('Nova Zelândia','Seleção da Nova Zelândia','OFC'),
 ('Portugal','Seleção de Portugal','UEFA'),
 ('Tunísia','Seleção da Tunísia','CAF')
on conflict (country) do update set name=excluded.name,confederation=excluded.confederation,is_active=true;
