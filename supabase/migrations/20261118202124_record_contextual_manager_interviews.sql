create or replace function public.record_manager_interview(
  p_club_id uuid,
  p_match_id uuid,
  p_scenario text,
  p_question text,
  p_answer_key text,
  p_answer_title text,
  p_answer_text text,
  p_fan_pressure_delta integer,
  p_board_pressure_delta integer,
  p_reputation_diretoria_delta integer,
  p_reputation_jogadores_delta integer,
  p_reputation_torcida_delta integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_interview_id uuid;
  v_club public.clubs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária.';
  end if;

  select * into v_club
  from public.clubs
  where id = p_club_id and owner_id = auth.uid()
  for update;

  if not found then
    raise exception 'Clube não encontrado ou sem autorização.';
  end if;

  if not exists (
    select 1 from public.matches
    where id = p_match_id and status = 'finished'
      and (home_club_id = p_club_id or away_club_id = p_club_id)
  ) then
    raise exception 'A entrevista precisa estar vinculada a uma partida finalizada do clube.';
  end if;

  insert into public.manager_interviews (
    club_id, match_id, scenario, question, answer_key, answer_title, answer_text,
    fan_pressure_delta, board_pressure_delta,
    reputation_diretoria_delta, reputation_jogadores_delta, reputation_torcida_delta
  ) values (
    p_club_id, p_match_id, p_scenario, p_question, p_answer_key, p_answer_title, p_answer_text,
    p_fan_pressure_delta, p_board_pressure_delta,
    p_reputation_diretoria_delta, p_reputation_jogadores_delta, p_reputation_torcida_delta
  )
  on conflict (club_id, match_id) where match_id is not null
  do nothing
  returning id into v_interview_id;

  if v_interview_id is null then
    return jsonb_build_object('status','already_answered');
  end if;

  update public.clubs
  set pressao_torcida = greatest(0, least(100, coalesce(pressao_torcida,50) + p_fan_pressure_delta)),
      pressao_diretoria = greatest(0, least(100, coalesce(pressao_diretoria,50) + p_board_pressure_delta)),
      reputacao_diretoria = greatest(0, least(100, coalesce(reputacao_diretoria,50) + p_reputation_diretoria_delta)),
      reputacao_jogadores = greatest(0, least(100, coalesce(reputacao_jogadores,50) + p_reputation_jogadores_delta)),
      reputacao_torcida = greatest(0, least(100, coalesce(reputacao_torcida,50) + p_reputation_torcida_delta))
  where id = p_club_id;

  return jsonb_build_object('status','recorded','interview_id',v_interview_id);
end;
$$;

revoke all on function public.record_manager_interview(uuid,uuid,text,text,text,text,text,integer,integer,integer,integer,integer) from public, anon;
grant execute on function public.record_manager_interview(uuid,uuid,text,text,text,text,text,integer,integer,integer,integer,integer) to authenticated;
