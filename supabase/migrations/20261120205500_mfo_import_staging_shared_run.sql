drop function if exists public.mfo_stage_football_import(text,jsonb,jsonb);
create or replace function public.mfo_stage_football_import(
  p_provider text, p_teams jsonb default '[]'::jsonb, p_players jsonb default '[]'::jsonb, p_run_id uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_run_id uuid; v_team_count integer := 0; v_player_count integer := 0;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_provider is null or length(trim(p_provider)) = 0 then raise exception 'provider_required'; end if;
  if jsonb_typeof(coalesce(p_teams,'[]'::jsonb)) <> 'array' or jsonb_typeof(coalesce(p_players,'[]'::jsonb)) <> 'array' then raise exception 'teams_and_players_must_be_arrays'; end if;
  if p_run_id is null then
    insert into private.football_import_runs(provider,status,summary)
    values (p_provider,'staging',jsonb_build_object('teams_received',jsonb_array_length(coalesce(p_teams,'[]'::jsonb)),'players_received',jsonb_array_length(coalesce(p_players,'[]'::jsonb))))
    returning id into v_run_id;
  else
    select id into v_run_id from private.football_import_runs where id=p_run_id and provider=p_provider and status='staging' for update;
    if v_run_id is null then raise exception 'invalid_or_closed_import_run'; end if;
  end if;
  insert into private.football_import_teams(run_id,external_id,country,competition,team_name,payload)
  select v_run_id,x->>'external_id',x->>'country',x->>'competition',coalesce(x->>'team_name','(sem nome)'),coalesce(x->'payload','{}'::jsonb)
  from jsonb_array_elements(coalesce(p_teams,'[]'::jsonb)) x where nullif(x->>'external_id','') is not null on conflict (run_id,external_id) do nothing;
  get diagnostics v_team_count = row_count;
  insert into private.football_import_players(run_id,external_player_id,external_team_id,player_name,payload)
  select v_run_id,x->>'external_player_id',x->>'external_team_id',coalesce(x->>'player_name','(sem nome)'),coalesce(x->'payload','{}'::jsonb)
  from jsonb_array_elements(coalesce(p_players,'[]'::jsonb)) x where nullif(x->>'external_player_id','') is not null on conflict (run_id,external_player_id,external_team_id) do nothing;
  get diagnostics v_player_count = row_count;
  update private.football_import_runs set summary=summary||jsonb_build_object(
    'teams_staged_total',(select count(*) from private.football_import_teams where run_id=v_run_id),
    'players_staged_total',(select count(*) from private.football_import_players where run_id=v_run_id)) where id=v_run_id;
  return jsonb_build_object('run_id',v_run_id,'teams_added',v_team_count,'players_added',v_player_count,'status','staging');
end; $$;
revoke all on function public.mfo_stage_football_import(text,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.mfo_stage_football_import(text,jsonb,jsonb,uuid) to service_role;
