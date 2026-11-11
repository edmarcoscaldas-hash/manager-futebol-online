-- Manager Futebol Online: módulo de categorias de base
-- Não altera nem remove jogadores existentes. Todos os jogadores atuais permanecem no profissional.

alter table public.players
  add column if not exists is_youth boolean not null default false;

create index if not exists players_youth_club_idx
  on public.players (club_id, is_youth, overall desc);

-- Candidatos apresentados nas peneiras. Só entram em players quando o treinador os contrata.
create table if not exists public.academy_trials (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  nome text not null,
  posicao text not null,
  data_nascimento date not null,
  overall integer not null check (overall between 1 and 100),
  potencial integer not null check (potencial between 1 and 100),
  nacionalidade text not null default 'Brasil',
  is_star boolean not null default false,
  status text not null default 'disponivel'
    check (status in ('disponivel', 'contratado', 'dispensado')),
  signed_player_id uuid references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists academy_trials_club_status_idx
  on public.academy_trials (club_id, status, created_at desc);

alter table public.academy_trials enable row level security;

drop policy if exists academy_trials_owner_access on public.academy_trials;
create policy academy_trials_owner_access
on public.academy_trials
for all
to authenticated
using (
  exists (
    select 1 from public.clubs c
    where c.id = academy_trials.club_id
      and c.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.clubs c
    where c.id = academy_trials.club_id
      and c.owner_id = auth.uid()
  )
);

-- Permite contratar jovens para o próprio clube sem abrir escrita no catálogo global.
drop policy if exists players_owner_insert on public.players;
create policy players_owner_insert
on public.players
for insert
to authenticated
with check (
  club_id is not null
  and exists (
    select 1 from public.clubs c
    where c.id = players.club_id
      and c.owner_id = auth.uid()
  )
);

drop policy if exists players_owner_update on public.players;
create policy players_owner_update
on public.players
for update
to authenticated
using (
  club_id is not null
  and exists (
    select 1 from public.clubs c
    where c.id = players.club_id
      and c.owner_id = auth.uid()
  )
)
with check (
  club_id is not null
  and exists (
    select 1 from public.clubs c
    where c.id = players.club_id
      and c.owner_id = auth.uid()
  )
);
