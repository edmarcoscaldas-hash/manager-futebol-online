create table if not exists public.club_pressure_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  result text not null check (result in ('win','draw','loss')),
  fan_pressure_delta integer not null,
  board_pressure_delta integer not null,
  created_at timestamptz not null default now(),
  unique (club_id, match_id)
);

alter table public.club_pressure_events enable row level security;

drop policy if exists "Treinador consulta eventos de pressao do proprio clube" on public.club_pressure_events;
create policy "Treinador consulta eventos de pressao do proprio clube"
  on public.club_pressure_events for select to authenticated
  using (exists (
    select 1 from public.clubs c
    where c.id = club_pressure_events.club_id
      and c.owner_id = (select auth.uid())
  ));

drop policy if exists "Treinador registra eventos de pressao do proprio clube" on public.club_pressure_events;
create policy "Treinador registra eventos de pressao do proprio clube"
  on public.club_pressure_events for insert to authenticated
  with check (exists (
    select 1 from public.clubs c
    where c.id = club_pressure_events.club_id
      and c.owner_id = (select auth.uid())
  ));

grant select, insert on public.club_pressure_events to authenticated;

create or replace function public.apply_match_pressure_event(p_match_id uuid, p_club_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_match public.matches%rowtype;
  v_club public.clubs%rowtype;
  v_opponent public.clubs%rowtype;
  v_result text;
  v_fan_delta integer;
  v_board_delta integer;
  v_event_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  select * into v_club
  from public.clubs
  where id = p_club_id and owner_id = auth.uid();

  if not found then
    raise exception 'Clube não encontrado ou sem autorização.';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id and status = 'finished'
    and (home_club_id = p_club_id or away_club_id = p_club_id);

  if not found then
    raise exception 'Partida finalizada não encontrada para este clube.';
  end if;

  if v_match.home_club_id = p_club_id then
    if v_match.home_score > v_match.away_score then v_result := 'win';
    elsif v_match.home_score < v_match.away_score then v_result := 'loss';
    else v_result := 'draw'; end if;
    select * into v_opponent from public.clubs where id = v_match.away_club_id;
  else
    if v_match.away_score > v_match.home_score then v_result := 'win';
    elsif v_match.away_score < v_match.home_score then v_result := 'loss';
    else v_result := 'draw'; end if;
    select * into v_opponent from public.clubs where id = v_match.home_club_id;
  end if;

  if v_result = 'win' then
    v_fan_delta := -5; v_board_delta := -4;
  elsif v_result = 'loss' then
    v_fan_delta := 6; v_board_delta := 5;
  else
    v_fan_delta := 1; v_board_delta := 0;
  end if;

  if coalesce(v_club.cidade,'') <> '' and lower(v_club.cidade) = lower(coalesce(v_opponent.cidade,'')) then
    if v_result = 'win' then v_fan_delta := v_fan_delta - 3;
    elsif v_result = 'loss' then v_fan_delta := v_fan_delta + 4; end if;
  end if;

  insert into public.club_pressure_events
    (club_id, match_id, result, fan_pressure_delta, board_pressure_delta)
  values (p_club_id, p_match_id, v_result, v_fan_delta, v_board_delta)
  on conflict (club_id, match_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('status','already_processed','result',v_result);
  end if;

  update public.clubs
  set pressao_torcida = greatest(0, least(100, coalesce(pressao_torcida,50) + v_fan_delta)),
      pressao_diretoria = greatest(0, least(100, coalesce(pressao_diretoria,50) + v_board_delta))
  where id = p_club_id;

  return jsonb_build_object(
    'status','processed',
    'result',v_result,
    'fan_pressure_delta',v_fan_delta,
    'board_pressure_delta',v_board_delta
  );
end;
$$;

revoke all on function public.apply_match_pressure_event(uuid,uuid) from public, anon;
grant execute on function public.apply_match_pressure_event(uuid,uuid) to authenticated;
