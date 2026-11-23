-- Restringe as funções internas: somente as operações públicas autenticadas podem ser chamadas pelo cliente.
revoke all on function public.generate_manager_job_offers(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.generate_manager_job_offers(uuid,uuid,boolean) to postgres,service_role;
revoke all on function public.evaluate_manager_dismissal(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.evaluate_manager_dismissal(uuid,uuid,text) to postgres,service_role;

create or replace function public.generate_manager_job_offers(p_club_id uuid,p_match_id uuid,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_career public.manager_careers%rowtype; v_match_count integer; v_created integer:=0; v_salary numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select mc.* into v_career from public.manager_careers mc
  join public.manager_employments me on me.career_id=mc.id
  where mc.user_id=auth.uid() and me.club_id=p_club_id and me.status in ('active','dismissed')
  order by me.ended_at desc nulls first limit 1;
  if not found then raise exception 'Carreira não encontrada para este clube.'; end if;
  if not exists(select 1 from public.matches where id=p_match_id and status='finished'
    and (home_club_id=p_club_id or away_club_id=p_club_id)) then raise exception 'Partida de referência inválida.'; end if;
  select count(*) into v_match_count from public.club_pressure_events where club_id=p_club_id;
  if not p_force and (v_match_count=0 or mod(v_match_count,5)<>0) then
    return jsonb_build_object('created',0,'reason','not_offer_round');
  end if;
  if exists(select 1 from public.manager_job_offers where career_id=v_career.id and source_match_id=p_match_id) then
    return jsonb_build_object('created',0,'reason','already_generated');
  end if;
  v_salary:=greatest(2200,2200+(v_career.reputation*115)+(v_career.experience_seasons*300));
  insert into public.manager_job_offers(career_id,club_id,source_match_id,offered_salary,contract_months,offer_message)
  select v_career.id,c.id,p_match_id,round(v_salary*(0.85+random()*0.55),2),
    case when v_career.reputation>=75 then 24 when v_career.reputation>=35 then 12 else 6 end,
    case when v_career.reputation>=80 then 'A diretoria acredita que sua experiência pode levar o clube a disputar títulos.'
      when v_career.reputation>=35 then 'O clube acompanha seu trabalho e gostaria de contar com você em um novo projeto.'
      else 'O clube oferece uma oportunidade para você mostrar seu potencial e construir uma trajetória no futebol.' end
  from public.clubs c where c.is_ai=true
    and not exists(select 1 from public.manager_employments me where me.club_id=c.id and me.status='active')
    and not exists(select 1 from public.manager_job_offers old where old.career_id=v_career.id and old.club_id=c.id and old.status='pending' and old.expires_at>now())
  order by random() limit 3 on conflict(career_id,source_match_id,club_id) do nothing;
  get diagnostics v_created=row_count;
  return jsonb_build_object('created',v_created,'career_id',v_career.id);
end;
$$;

create or replace function public.apply_match_pressure_event(p_match_id uuid,p_club_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_match public.matches%rowtype; v_club public.clubs%rowtype; v_opponent public.clubs%rowtype;
  v_result text; v_fan_delta integer; v_board_delta integer; v_event_id uuid; v_job_status jsonb; v_offers jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select * into v_club from public.clubs where id=p_club_id and (
    owner_id=auth.uid() or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
      where me.club_id=clubs.id and me.status='active' and mc.user_id=auth.uid()));
  if not found then raise exception 'Clube não encontrado ou sem autorização.'; end if;
  select * into v_match from public.matches where id=p_match_id and status='finished'
    and (home_club_id=p_club_id or away_club_id=p_club_id);
  if not found then raise exception 'Partida finalizada não encontrada para este clube.'; end if;
  if v_match.home_club_id=p_club_id then
    if v_match.home_score>v_match.away_score then v_result:='win'; elsif v_match.home_score<v_match.away_score then v_result:='loss'; else v_result:='draw'; end if;
    select * into v_opponent from public.clubs where id=v_match.away_club_id;
  else
    if v_match.away_score>v_match.home_score then v_result:='win'; elsif v_match.away_score<v_match.home_score then v_result:='loss'; else v_result:='draw'; end if;
    select * into v_opponent from public.clubs where id=v_match.home_club_id;
  end if;
  if v_result='win' then v_fan_delta:=-5; v_board_delta:=-4;
  elsif v_result='loss' then v_fan_delta:=6; v_board_delta:=5; else v_fan_delta:=1; v_board_delta:=0; end if;
  if coalesce(v_club.cidade,'')<>'' and lower(v_club.cidade)=lower(coalesce(v_opponent.cidade,'')) then
    if v_result='win' then v_fan_delta:=v_fan_delta-3; elsif v_result='loss' then v_fan_delta:=v_fan_delta+4; end if;
  end if;
  insert into public.club_pressure_events(club_id,match_id,result,fan_pressure_delta,board_pressure_delta)
  values(p_club_id,p_match_id,v_result,v_fan_delta,v_board_delta)
  on conflict(club_id,match_id) do nothing returning id into v_event_id;
  if v_event_id is null then return jsonb_build_object('status','already_processed','result',v_result); end if;
  update public.clubs set pressao_torcida=greatest(0,least(100,coalesce(pressao_torcida,50)+v_fan_delta)),
    pressao_diretoria=greatest(0,least(100,coalesce(pressao_diretoria,50)+v_board_delta)) where id=p_club_id;
  update public.manager_careers mc set reputation=greatest(0,least(100,mc.reputation+
    case when v_result='win' then 2 when v_result='loss' then -2 else 0 end)),updated_at=now()
  where mc.user_id=auth.uid() and exists(select 1 from public.manager_employments me
    where me.career_id=mc.id and me.club_id=p_club_id and me.status='active');
  v_job_status:=public.evaluate_manager_dismissal(p_club_id,p_match_id,v_result);
  if coalesce((v_job_status->>'dismissed')::boolean,false)=false then
    v_offers:=public.generate_manager_job_offers(p_club_id,p_match_id,false);
  end if;
  return jsonb_build_object('status','processed','result',v_result,'fan_pressure_delta',v_fan_delta,
    'board_pressure_delta',v_board_delta,'job_status',v_job_status,'offers',coalesce(v_offers,'{"created":0}'::jsonb));
end;
$$;
revoke all on function public.apply_match_pressure_event(uuid,uuid) from public,anon;
grant execute on function public.apply_match_pressure_event(uuid,uuid) to authenticated;

create or replace function public.record_manager_interview(
 p_club_id uuid,p_match_id uuid,p_scenario text,p_question text,p_answer_key text,p_answer_title text,p_answer_text text,
 p_fan_pressure_delta integer,p_board_pressure_delta integer,p_reputation_diretoria_delta integer,
 p_reputation_jogadores_delta integer,p_reputation_torcida_delta integer)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_interview_id uuid; v_club public.clubs%rowtype; v_match public.matches%rowtype; v_result text; v_job_status jsonb;
begin
 if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
 if p_answer_key not in ('assumir','proteger','cobrar') or p_fan_pressure_delta not between -15 and 15
   or p_board_pressure_delta not between -15 and 15 or p_reputation_diretoria_delta not between -10 and 10
   or p_reputation_jogadores_delta not between -10 and 10 or p_reputation_torcida_delta not between -10 and 10 then
   raise exception 'Resposta ou impacto da entrevista inválido.';
 end if;
 select * into v_club from public.clubs where id=p_club_id and (
   owner_id=auth.uid() or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
    where me.club_id=clubs.id and me.status='active' and mc.user_id=auth.uid())) for update;
 if not found then raise exception 'Clube não encontrado ou sem autorização.'; end if;
 select * into v_match from public.matches where id=p_match_id and status='finished'
   and (home_club_id=p_club_id or away_club_id=p_club_id);
 if not found then raise exception 'A entrevista precisa estar vinculada a uma partida finalizada do clube.'; end if;
 insert into public.manager_interviews(club_id,match_id,scenario,question,answer_key,answer_title,answer_text,
  fan_pressure_delta,board_pressure_delta,reputation_diretoria_delta,reputation_jogadores_delta,reputation_torcida_delta)
 values(p_club_id,p_match_id,p_scenario,p_question,p_answer_key,p_answer_title,p_answer_text,p_fan_pressure_delta,
  p_board_pressure_delta,p_reputation_diretoria_delta,p_reputation_jogadores_delta,p_reputation_torcida_delta)
 on conflict(club_id,match_id) where match_id is not null do nothing returning id into v_interview_id;
 if v_interview_id is null then return jsonb_build_object('status','already_answered'); end if;
 update public.clubs set pressao_torcida=greatest(0,least(100,coalesce(pressao_torcida,50)+p_fan_pressure_delta)),
  pressao_diretoria=greatest(0,least(100,coalesce(pressao_diretoria,50)+p_board_pressure_delta)),
  reputacao_diretoria=greatest(0,least(100,coalesce(reputacao_diretoria,50)+p_reputation_diretoria_delta)),
  reputacao_jogadores=greatest(0,least(100,coalesce(reputacao_jogadores,50)+p_reputation_jogadores_delta)),
  reputacao_torcida=greatest(0,least(100,coalesce(reputacao_torcida,50)+p_reputation_torcida_delta)) where id=p_club_id;
 if v_match.home_club_id=p_club_id then
  v_result:=case when v_match.home_score>v_match.away_score then 'win' when v_match.home_score<v_match.away_score then 'loss' else 'draw' end;
 else
  v_result:=case when v_match.away_score>v_match.home_score then 'win' when v_match.away_score<v_match.home_score then 'loss' else 'draw' end;
 end if;
 v_job_status:=public.evaluate_manager_dismissal(p_club_id,p_match_id,v_result);
 return jsonb_build_object('status','recorded','interview_id',v_interview_id,'job_status',v_job_status);
end;
$$;
revoke all on function public.record_manager_interview(uuid,uuid,text,text,text,text,text,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.record_manager_interview(uuid,uuid,text,text,text,text,text,integer,integer,integer,integer,integer) to authenticated;

drop policy if exists "Treinador consulta entrevistas do proprio clube" on public.manager_interviews;
create policy "Treinador consulta entrevistas do proprio clube" on public.manager_interviews for select to authenticated
using (exists(select 1 from public.clubs c where c.id=manager_interviews.club_id and c.owner_id=(select auth.uid()))
 or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
  where me.club_id=manager_interviews.club_id and mc.user_id=(select auth.uid())));
drop policy if exists "Treinador consulta eventos de pressao do proprio clube" on public.club_pressure_events;
create policy "Treinador consulta eventos de pressao do proprio clube" on public.club_pressure_events for select to authenticated
using (exists(select 1 from public.clubs c where c.id=club_pressure_events.club_id and c.owner_id=(select auth.uid()))
 or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
  where me.club_id=club_pressure_events.club_id and mc.user_id=(select auth.uid())));

create or replace function public.respond_manager_job_offer(p_offer_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_offer public.manager_job_offers%rowtype; v_career public.manager_careers%rowtype; v_employment_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  if p_decision is null or p_decision not in ('accept','reject') then raise exception 'Decisão inválida.'; end if;
  select o.* into v_offer from public.manager_job_offers o
  join public.manager_careers c on c.id=o.career_id
  where o.id=p_offer_id and c.user_id=auth.uid() for update of o;
  if not found then raise exception 'Proposta não encontrada.'; end if;
  if v_offer.status<>'pending' then raise exception 'Esta proposta já foi respondida.'; end if;
  if v_offer.expires_at<=now() then
    update public.manager_job_offers set status='expired',responded_at=now() where id=v_offer.id;
    raise exception 'Esta proposta expirou.';
  end if;
  select * into v_career from public.manager_careers where id=v_offer.career_id and user_id=auth.uid() for update;
  if not found then raise exception 'Carreira não encontrada.'; end if;
  if p_decision='reject' then
    update public.manager_job_offers set status='rejected',responded_at=now() where id=v_offer.id;
    return jsonb_build_object('status','rejected');
  end if;
  if exists(select 1 from public.manager_employments where club_id=v_offer.club_id and status='active') then
    raise exception 'Este clube já contratou outro treinador.';
  end if;
  update public.manager_employments set status='resigned',ended_at=now(),
    termination_reason='Saída para aceitar uma proposta de outro clube.'
  where career_id=v_career.id and status='active';
  insert into public.manager_employments(career_id,club_id,salary,contract_start,contract_end,status)
  values(v_career.id,v_offer.club_id,v_offer.offered_salary,current_date,
    (current_date+make_interval(months=>v_offer.contract_months))::date,'active')
  returning id into v_employment_id;
  update public.manager_job_offers set status=case when id=v_offer.id then 'accepted' else 'expired' end,
    responded_at=now() where career_id=v_career.id and status='pending';
  return jsonb_build_object('status','accepted','employment_id',v_employment_id,'club_id',v_offer.club_id,'salary',v_offer.offered_salary);
end;
$$;
revoke all on function public.respond_manager_job_offer(uuid,text) from public,anon;
grant execute on function public.respond_manager_job_offer(uuid,text) to authenticated;

-- Reinicia a contagem de cinco partidas a cada novo vínculo do treinador.
create or replace function public.generate_manager_job_offers(p_club_id uuid,p_match_id uuid,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_career public.manager_careers%rowtype; v_started_at timestamptz; v_match_count integer; v_created integer:=0; v_salary numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select mc.* into v_career from public.manager_careers mc join public.manager_employments me on me.career_id=mc.id
  where mc.user_id=auth.uid() and me.club_id=p_club_id and me.status in ('active','dismissed')
  order by me.ended_at desc nulls first limit 1;
  if not found then raise exception 'Carreira não encontrada para este clube.'; end if;
  select me.created_at into v_started_at from public.manager_employments me
  where me.career_id=v_career.id and me.club_id=p_club_id and me.status in ('active','dismissed')
  order by me.ended_at desc nulls first limit 1;
  if not exists(select 1 from public.matches where id=p_match_id and status='finished' and (home_club_id=p_club_id or away_club_id=p_club_id)) then
    raise exception 'Partida de referência inválida.';
  end if;
  select count(*) into v_match_count from public.club_pressure_events where club_id=p_club_id and created_at>=v_started_at;
  if not p_force and (v_match_count=0 or mod(v_match_count,5)<>0) then return jsonb_build_object('created',0,'reason','not_offer_round'); end if;
  if exists(select 1 from public.manager_job_offers where career_id=v_career.id and source_match_id=p_match_id) then
    return jsonb_build_object('created',0,'reason','already_generated');
  end if;
  v_salary:=greatest(2200,2200+(v_career.reputation*115)+(v_career.experience_seasons*300));
  insert into public.manager_job_offers(career_id,club_id,source_match_id,offered_salary,contract_months,offer_message)
  select v_career.id,c.id,p_match_id,round(v_salary*(0.85+random()*0.55),2),
    case when v_career.reputation>=75 then 24 when v_career.reputation>=35 then 12 else 6 end,
    case when v_career.reputation>=80 then 'A diretoria acredita que sua experiência pode levar o clube a disputar títulos.'
      when v_career.reputation>=35 then 'O clube acompanha seu trabalho e gostaria de contar com você em um novo projeto.'
      else 'O clube oferece uma oportunidade para você mostrar seu potencial e construir uma trajetória no futebol.' end
  from public.clubs c where c.is_ai=true
    and not exists(select 1 from public.manager_employments me where me.club_id=c.id and me.status='active')
    and not exists(select 1 from public.manager_job_offers old where old.career_id=v_career.id and old.club_id=c.id and old.status='pending' and old.expires_at>now())
  order by random() limit 3 on conflict(career_id,source_match_id,club_id) do nothing;
  get diagnostics v_created=row_count;
  return jsonb_build_object('created',v_created,'career_id',v_career.id);
end;
$$;
revoke all on function public.generate_manager_job_offers(uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.generate_manager_job_offers(uuid,uuid,boolean) to postgres,service_role;
