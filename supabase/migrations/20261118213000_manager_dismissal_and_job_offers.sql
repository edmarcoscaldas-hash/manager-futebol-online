alter table public.manager_employments
  add column if not exists termination_reason text;

create table if not exists public.manager_job_offers (
  id uuid primary key default gen_random_uuid(),
  career_id uuid not null references public.manager_careers(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete restrict,
  source_match_id uuid not null references public.matches(id) on delete cascade,
  offered_salary numeric not null check (offered_salary >= 0),
  contract_months integer not null default 12 check (contract_months in (6,12,24)),
  offer_message text not null,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  responded_at timestamptz
);
create unique index if not exists manager_job_offers_unique_source_idx
  on public.manager_job_offers(career_id, source_match_id, club_id);
create index if not exists manager_job_offers_career_status_idx
  on public.manager_job_offers(career_id, status, created_at desc);
alter table public.manager_job_offers enable row level security;
drop policy if exists "Treinador consulta suas propostas" on public.manager_job_offers;
create policy "Treinador consulta suas propostas"
  on public.manager_job_offers for select to authenticated
  using (exists (select 1 from public.manager_careers c
    where c.id=manager_job_offers.career_id and c.user_id=(select auth.uid())));
grant select on public.manager_job_offers to authenticated;

create or replace function public.generate_manager_job_offers(p_club_id uuid,p_match_id uuid,p_force boolean default false)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_career public.manager_careers%rowtype;
  v_match_count integer;
  v_created integer:=0;
  v_salary numeric;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select mc.* into v_career
  from public.manager_careers mc
  join public.manager_employments me on me.career_id=mc.id
  where mc.user_id=auth.uid() and me.club_id=p_club_id and me.status in ('active','dismissed')
  order by me.ended_at desc nulls first limit 1;
  if not found then raise exception 'Carreira não encontrada para este clube.'; end if;
  if not exists (select 1 from public.matches where id=p_match_id and status='finished'
    and (home_club_id=p_club_id or away_club_id=p_club_id)) then
    raise exception 'Partida de referência inválida.';
  end if;
  select count(*) into v_match_count from public.club_pressure_events where club_id=p_club_id;
  if not p_force and (v_match_count=0 or mod(v_match_count,5)<>0) then
    return jsonb_build_object('created',0,'reason','not_offer_round');
  end if;
  if v_career.reputation<20 then return jsonb_build_object('created',0,'reason','reputation_too_low'); end if;
  if exists (select 1 from public.manager_job_offers where career_id=v_career.id and source_match_id=p_match_id) then
    return jsonb_build_object('created',0,'reason','already_generated');
  end if;
  v_salary:=greatest(2500,2500+(v_career.reputation*115)+(v_career.experience_seasons*300));
  insert into public.manager_job_offers(career_id,club_id,source_match_id,offered_salary,contract_months,offer_message)
  select v_career.id,c.id,p_match_id,round(v_salary*(0.85+random()*0.55),2),
    case when v_career.reputation>=75 then 24 when v_career.reputation>=45 then 12 else 6 end,
    case when v_career.reputation>=80 then 'A diretoria acredita que sua experiência pode levar o clube a disputar títulos.'
      when v_career.reputation>=55 then 'O clube acompanha seu trabalho e gostaria de contar com você em um novo projeto.'
      else 'O clube oferece uma oportunidade para reconstruir a equipe e recuperar espaço no cenário nacional.' end
  from public.clubs c
  where c.is_ai=true
    and not exists (select 1 from public.manager_employments me where me.club_id=c.id and me.status='active')
    and not exists (select 1 from public.manager_job_offers old where old.career_id=v_career.id and old.club_id=c.id and old.status='pending' and old.expires_at>now())
  order by random() limit 3
  on conflict (career_id,source_match_id,club_id) do nothing;
  get diagnostics v_created=row_count;
  return jsonb_build_object('created',v_created,'career_id',v_career.id);
end;
$$;
revoke all on function public.generate_manager_job_offers(uuid,uuid,boolean) from public,anon;
grant execute on function public.generate_manager_job_offers(uuid,uuid,boolean) to authenticated;

create or replace function public.evaluate_manager_dismissal(p_club_id uuid,p_match_id uuid,p_result text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_employment public.manager_employments%rowtype;
  v_career public.manager_careers%rowtype;
  v_pressure integer;
  v_losses integer;
  v_dismissed boolean:=false;
  v_reason text;
  v_offers jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select me.* into v_employment from public.manager_employments me
  join public.manager_careers mc on mc.id=me.career_id
  where me.club_id=p_club_id and me.status='active' and mc.user_id=auth.uid()
  for update of me;
  if not found then return jsonb_build_object('dismissed',false,'reason','no_active_employment'); end if;
  select * into v_career from public.manager_careers where id=v_employment.career_id;
  select pressao_diretoria into v_pressure from public.clubs where id=p_club_id;
  select count(*) into v_losses from (
    select result from public.club_pressure_events where club_id=p_club_id order by created_at desc limit 5
  ) recent where recent.result='loss';
  if (coalesce(v_pressure,50)>=98)
    or (coalesce(v_pressure,50)>=95 and p_result='loss')
    or (coalesce(v_pressure,50)>=90 and v_losses>=3) then
    v_reason:=case when coalesce(v_pressure,50)>=98 then 'Crise institucional: pressão da diretoria chegou ao nível máximo.'
      when v_losses>=3 then 'Sequência de resultados negativos e pressão elevada da diretoria.'
      else 'Derrota com pressão da diretoria em nível crítico.' end;
    update public.manager_employments set status='dismissed',ended_at=now(),termination_reason=v_reason where id=v_employment.id;
    update public.manager_careers set reputation=greatest(0,reputation-5),updated_at=now() where id=v_career.id;
    v_dismissed:=true;
    v_offers:=public.generate_manager_job_offers(p_club_id,p_match_id,true);
  end if;
  return jsonb_build_object('dismissed',v_dismissed,'reason',v_reason,'board_pressure',v_pressure,
    'recent_losses',v_losses,'offers',coalesce(v_offers,'{"created":0}'::jsonb));
end;
$$;
revoke all on function public.evaluate_manager_dismissal(uuid,uuid,text) from public,anon;
grant execute on function public.evaluate_manager_dismissal(uuid,uuid,text) to authenticated;

create or replace function public.respond_manager_job_offer(p_offer_id uuid,p_decision text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_offer public.manager_job_offers%rowtype;
  v_career public.manager_careers%rowtype;
  v_employment_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  if p_decision not in ('accept','reject') then raise exception 'Decisão inválida.'; end if;
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
  if exists (select 1 from public.manager_employments where club_id=v_offer.club_id and status='active') then
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

drop policy if exists "Treinador consulta entrevistas do proprio clube" on public.manager_interviews;
create policy "Treinador consulta entrevistas do proprio clube" on public.manager_interviews for select to authenticated
using (
  exists(select 1 from public.clubs c where c.id=manager_interviews.club_id and c.owner_id=(select auth.uid()))
  or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
    where me.club_id=manager_interviews.club_id and me.status='active' and mc.user_id=(select auth.uid()))
);
drop policy if exists "Treinador registra entrevistas do proprio clube" on public.manager_interviews;
create policy "Treinador registra entrevistas do proprio clube" on public.manager_interviews for insert to authenticated
with check (
  exists(select 1 from public.clubs c where c.id=manager_interviews.club_id and c.owner_id=(select auth.uid()))
  or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
    where me.club_id=manager_interviews.club_id and me.status='active' and mc.user_id=(select auth.uid()))
);
drop policy if exists "Treinador consulta eventos de pressao do proprio clube" on public.club_pressure_events;
create policy "Treinador consulta eventos de pressao do proprio clube" on public.club_pressure_events for select to authenticated
using (
  exists(select 1 from public.clubs c where c.id=club_pressure_events.club_id and c.owner_id=(select auth.uid()))
  or exists(select 1 from public.manager_employments me join public.manager_careers mc on mc.id=me.career_id
    where me.club_id=club_pressure_events.club_id and me.status='active' and mc.user_id=(select auth.uid()))
);

create or replace function public.apply_match_pressure_event(p_match_id uuid,p_club_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_match public.matches%rowtype; v_club public.clubs%rowtype; v_opponent public.clubs%rowtype;
  v_result text; v_fan_delta integer; v_board_delta integer; v_event_id uuid;
  v_job_status jsonb; v_offers jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select * into v_club from public.clubs where id=p_club_id and (
    owner_id=auth.uid() or exists(select 1 from public.manager_employments me
      join public.manager_careers mc on mc.id=me.career_id
      where me.club_id=clubs.id and me.status='active' and mc.user_id=auth.uid())
  );
  if not found then raise exception 'Clube não encontrado ou sem autorização.'; end if;
  select * into v_match from public.matches where id=p_match_id and status='finished'
    and (home_club_id=p_club_id or away_club_id=p_club_id);
  if not found then raise exception 'Partida finalizada não encontrada para este clube.'; end if;
  if v_match.home_club_id=p_club_id then
    if v_match.home_score>v_match.away_score then v_result:='win';
    elsif v_match.home_score<v_match.away_score then v_result:='loss'; else v_result:='draw'; end if;
    select * into v_opponent from public.clubs where id=v_match.away_club_id;
  else
    if v_match.away_score>v_match.home_score then v_result:='win';
    elsif v_match.away_score<v_match.home_score then v_result:='loss'; else v_result:='draw'; end if;
    select * into v_opponent from public.clubs where id=v_match.home_club_id;
  end if;
  if v_result='win' then v_fan_delta:=-5; v_board_delta:=-4;
  elsif v_result='loss' then v_fan_delta:=6; v_board_delta:=5;
  else v_fan_delta:=1; v_board_delta:=0; end if;
  if coalesce(v_club.cidade,'')<>'' and lower(v_club.cidade)=lower(coalesce(v_opponent.cidade,'')) then
    if v_result='win' then v_fan_delta:=v_fan_delta-3;
    elsif v_result='loss' then v_fan_delta:=v_fan_delta+4; end if;
  end if;
  insert into public.club_pressure_events(club_id,match_id,result,fan_pressure_delta,board_pressure_delta)
  values(p_club_id,p_match_id,v_result,v_fan_delta,v_board_delta)
  on conflict(club_id,match_id) do nothing returning id into v_event_id;
  if v_event_id is null then return jsonb_build_object('status','already_processed','result',v_result); end if;
  update public.clubs set pressao_torcida=greatest(0,least(100,coalesce(pressao_torcida,50)+v_fan_delta)),
    pressao_diretoria=greatest(0,least(100,coalesce(pressao_diretoria,50)+v_board_delta)) where id=p_club_id;
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
  p_club_id uuid,p_match_id uuid,p_scenario text,p_question text,p_answer_key text,p_answer_title text,
  p_answer_text text,p_fan_pressure_delta integer,p_board_pressure_delta integer,
  p_reputation_diretoria_delta integer,p_reputation_jogadores_delta integer,p_reputation_torcida_delta integer
)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_interview_id uuid; v_club public.clubs%rowtype; v_match public.matches%rowtype;
  v_result text; v_job_status jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticação necessária.'; end if;
  select * into v_club from public.clubs where id=p_club_id and (
    owner_id=auth.uid() or exists(select 1 from public.manager_employments me
      join public.manager_careers mc on mc.id=me.career_id
      where me.club_id=clubs.id and me.status='active' and mc.user_id=auth.uid())
  ) for update;
  if not found then raise exception 'Clube não encontrado ou sem autorização.'; end if;
  select * into v_match from public.matches where id=p_match_id and status='finished'
    and (home_club_id=p_club_id or away_club_id=p_club_id);
  if not found then raise exception 'A entrevista precisa estar vinculada a uma partida finalizada do clube.'; end if;
  insert into public.manager_interviews(club_id,match_id,scenario,question,answer_key,answer_title,answer_text,
    fan_pressure_delta,board_pressure_delta,reputation_diretoria_delta,reputation_jogadores_delta,reputation_torcida_delta)
  values(p_club_id,p_match_id,p_scenario,p_question,p_answer_key,p_answer_title,p_answer_text,
    p_fan_pressure_delta,p_board_pressure_delta,p_reputation_diretoria_delta,p_reputation_jogadores_delta,p_reputation_torcida_delta)
  on conflict(club_id,match_id) where match_id is not null do nothing returning id into v_interview_id;
  if v_interview_id is null then return jsonb_build_object('status','already_answered'); end if;
  update public.clubs set pressao_torcida=greatest(0,least(100,coalesce(pressao_torcida,50)+p_fan_pressure_delta)),
    pressao_diretoria=greatest(0,least(100,coalesce(pressao_diretoria,50)+p_board_pressure_delta)),
    reputacao_diretoria=greatest(0,least(100,coalesce(reputacao_diretoria,50)+p_reputation_diretoria_delta)),
    reputacao_jogadores=greatest(0,least(100,coalesce(reputacao_jogadores,50)+p_reputation_jogadores_delta)),
    reputacao_torcida=greatest(0,least(100,coalesce(reputacao_torcida,50)+p_reputation_torcida_delta))
  where id=p_club_id;
  if v_match.home_club_id=p_club_id then
    v_result:=case when v_match.home_score>v_match.away_score then 'win'
      when v_match.home_score<v_match.away_score then 'loss' else 'draw' end;
  else
    v_result:=case when v_match.away_score>v_match.home_score then 'win'
      when v_match.away_score<v_match.home_score then 'loss' else 'draw' end;
  end if;
  v_job_status:=public.evaluate_manager_dismissal(p_club_id,p_match_id,v_result);
  return jsonb_build_object('status','recorded','interview_id',v_interview_id,'job_status',v_job_status);
end;
$$;
revoke all on function public.record_manager_interview(uuid,uuid,text,text,text,text,text,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.record_manager_interview(uuid,uuid,text,text,text,text,text,integer,integer,integer,integer,integer) to authenticated;
