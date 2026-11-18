alter table public.clubs
  add column if not exists reputacao_diretoria integer not null default 50 check (reputacao_diretoria between 0 and 100),
  add column if not exists reputacao_jogadores integer not null default 50 check (reputacao_jogadores between 0 and 100),
  add column if not exists reputacao_torcida integer not null default 50 check (reputacao_torcida between 0 and 100),
  add column if not exists pressao_torcida integer not null default 50 check (pressao_torcida between 0 and 100),
  add column if not exists pressao_diretoria integer not null default 50 check (pressao_diretoria between 0 and 100);

create table if not exists public.manager_interviews (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  match_id uuid null references public.matches(id) on delete set null,
  scenario text not null,
  question text not null,
  answer_key text not null,
  answer_title text not null,
  answer_text text not null,
  fan_pressure_delta integer not null default 0,
  board_pressure_delta integer not null default 0,
  reputation_diretoria_delta integer not null default 0,
  reputation_jogadores_delta integer not null default 0,
  reputation_torcida_delta integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists manager_interviews_club_created_idx
  on public.manager_interviews (club_id, created_at desc);
create unique index if not exists manager_interviews_one_per_match_idx
  on public.manager_interviews (club_id, match_id)
  where match_id is not null;

alter table public.manager_interviews enable row level security;

drop policy if exists "Treinador consulta entrevistas do proprio clube" on public.manager_interviews;
create policy "Treinador consulta entrevistas do proprio clube"
  on public.manager_interviews for select to authenticated
  using (exists (
    select 1 from public.clubs c
    where c.id = manager_interviews.club_id
      and c.owner_id = (select auth.uid())
  ));

drop policy if exists "Treinador registra entrevistas do proprio clube" on public.manager_interviews;
create policy "Treinador registra entrevistas do proprio clube"
  on public.manager_interviews for insert to authenticated
  with check (exists (
    select 1 from public.clubs c
    where c.id = manager_interviews.club_id
      and c.owner_id = (select auth.uid())
  ));

grant select, insert on public.manager_interviews to authenticated;
