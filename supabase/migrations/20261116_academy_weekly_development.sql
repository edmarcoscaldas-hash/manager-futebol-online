-- MFO: categorias Sub-15, Sub-17 e Sub-20 com evolução gradual semanal.
-- Migração aditiva: preserva jogadores, contratos, candidatos e peneiras existentes.

create table if not exists public.academy_training_sessions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  week_start date not null,
  trained_at timestamptz not null default now(),
  players_trained integer not null default 0 check (players_trained >= 0),
  points_added integer not null default 0 check (points_added >= 0),
  created_at timestamptz not null default now(),
  constraint academy_training_sessions_club_week_unique unique (club_id, week_start)
);

create index if not exists players_academy_club_age_idx
  on public.players (club_id, data_nascimento)
  where is_youth = true;

alter table public.academy_training_sessions enable row level security;

drop policy if exists academy_training_sessions_manager_select
  on public.academy_training_sessions;

create policy academy_training_sessions_manager_select
on public.academy_training_sessions
for select
to authenticated
using (public.mfo_user_can_manage_club(club_id));

revoke all on table public.academy_training_sessions from public, anon, authenticated;
grant select on table public.academy_training_sessions to authenticated;

create or replace function public.mfo_train_academy_week(p_club_id uuid)
returns table (
  players_trained integer,
  points_added integer,
  next_training_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_week_start date := date_trunc('week', timezone('America/Sao_Paulo', now()))::date;
  v_players integer := 0;
  v_points integer := 0;
  v_session_id uuid;
  v_next_training_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Faça login para treinar a categoria de base.';
  end if;

  if p_club_id is null or not public.mfo_user_can_manage_club(p_club_id) then
    raise exception 'Você não tem permissão para treinar a base deste clube.';
  end if;

  select count(*)::integer
    into v_players
  from public.players p
  where p.club_id = p_club_id
    and p.is_youth = true
    and p.data_nascimento is not null
    and extract(year from age(current_date, p.data_nascimento)) between 14 and 20;

  if v_players = 0 then
    raise exception 'Seu clube ainda não possui atletas Sub-15, Sub-17 ou Sub-20 para treinar.';
  end if;

  insert into public.academy_training_sessions (club_id, week_start)
  values (p_club_id, v_week_start)
  on conflict (club_id, week_start) do nothing
  returning id into v_session_id;

  if v_session_id is null then
    raise exception 'O treino desta semana já foi realizado. Volte na próxima semana.';
  end if;

  with evolucao as (
    select
      p.id,
      coalesce(p.overall, 50) as overall_atual,
      least(100, coalesce(p.potencial, p.overall, 60)) as teto,
      extract(year from age(current_date, p.data_nascimento))::integer as idade,
      case
        when coalesce(p.overall, 50) >= least(100, coalesce(p.potencial, p.overall, 60)) then 0
        when extract(year from age(current_date, p.data_nascimento)) <= 15
          then case when random() < 0.04 then 2 when random() < 0.62 then 1 else 0 end
        when extract(year from age(current_date, p.data_nascimento)) <= 17
          then case when random() < 0.03 then 2 when random() < 0.50 then 1 else 0 end
        else case when random() < 0.015 then 2 when random() < 0.30 then 1 else 0 end
      end as ganho
    from public.players p
    where p.club_id = p_club_id
      and p.is_youth = true
      and p.data_nascimento is not null
      and extract(year from age(current_date, p.data_nascimento)) between 14 and 20
  ),
  atualizados as (
    update public.players p
       set overall = least(e.teto, e.overall_atual + e.ganho)
      from evolucao e
     where p.id = e.id
       and e.ganho > 0
       and e.overall_atual < e.teto
    returning p.id, p.overall - e.overall_atual as pontos
  )
  select coalesce(sum(pontos), 0)::integer
    into v_points
  from atualizados;

  update public.academy_training_sessions
     set players_trained = v_players,
         points_added = v_points
   where id = v_session_id;

  v_next_training_at :=
    ((v_week_start + 7)::timestamp at time zone 'America/Sao_Paulo');

  return query
    select v_players, v_points, v_next_training_at;
end;
$$;

revoke all on function public.mfo_train_academy_week(uuid) from public, anon;
grant execute on function public.mfo_train_academy_week(uuid) to authenticated;

comment on table public.academy_training_sessions is
  'Histórico de treino semanal da categoria de base do MFO, por clube.';
comment on function public.mfo_train_academy_week(uuid) is
  'Aplica evolução gradual aos jogadores Sub-15, Sub-17 e Sub-20, uma vez por semana por clube.';
