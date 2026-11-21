create or replace function public.mfo_list_import_staging(
  p_run_id uuid default null,
  p_team_offset integer default 0,
  p_player_offset integer default 0,
  p_page_size integer default 50
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_run jsonb;
  v_runs jsonb;
  v_teams jsonb := '[]'::jsonb;
  v_players jsonb := '[]'::jsonb;
  v_team_count integer := 0;
  v_player_count integer := 0;
  v_size integer := greatest(1, least(coalesce(p_page_size, 50), 100));
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_run_id is null then
    select coalesce(jsonb_agg(to_jsonb(r) order by r.started_at desc), '[]'::jsonb)
      into v_runs from (select id, provider, status, started_at, finished_at, summary, error_message
        from private.football_import_runs order by started_at desc limit 100) r;
    return jsonb_build_object('runs', v_runs);
  end if;
  select to_jsonb(r) into v_run from private.football_import_runs r where r.id = p_run_id;
  if v_run is null then raise exception 'import_run_not_found'; end if;
  select count(*) into v_team_count from private.football_import_teams where run_id = p_run_id;
  select count(*) into v_player_count from private.football_import_players where run_id = p_run_id;
  select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) into v_teams
    from (select id, external_id, country, competition, team_name, payload, matched_club_id, review_status
      from private.football_import_teams where run_id = p_run_id order by id
      offset greatest(0, coalesce(p_team_offset, 0)) limit v_size) t;
  select coalesce(jsonb_agg(to_jsonb(p) order by p.id), '[]'::jsonb) into v_players
    from (select id, external_player_id, external_team_id, player_name, payload, matched_player_id, review_status
      from private.football_import_players where run_id = p_run_id order by id
      offset greatest(0, coalesce(p_player_offset, 0)) limit v_size) p;
  return jsonb_build_object('run', v_run, 'teams', v_teams, 'players', v_players,
    'total_teams', v_team_count, 'total_players', v_player_count,
    'team_offset', greatest(0, coalesce(p_team_offset, 0)),
    'player_offset', greatest(0, coalesce(p_player_offset, 0)), 'page_size', v_size);
end;
$$;

create or replace function public.mfo_set_import_review_status(
  p_entity_type text, p_record_id bigint, p_review_status text
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_rows integer := 0;
begin
  if auth.role() <> 'service_role' then raise exception 'service_role_required'; end if;
  if p_entity_type not in ('team', 'player') then raise exception 'invalid_entity_type'; end if;
  if p_review_status not in ('pending', 'matched', 'new', 'ignored', 'conflict') then raise exception 'invalid_review_status'; end if;
  if p_entity_type = 'team' then
    update private.football_import_teams set review_status = p_review_status where id = p_record_id;
  else
    update private.football_import_players set review_status = p_review_status where id = p_record_id;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'staging_record_not_found'; end if;
  return jsonb_build_object('success', true, 'entity_type', p_entity_type, 'record_id', p_record_id, 'review_status', p_review_status);
end;
$$;

revoke all on function public.mfo_list_import_staging(uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.mfo_set_import_review_status(text, bigint, text) from public, anon, authenticated;
grant execute on function public.mfo_list_import_staging(uuid, integer, integer, integer) to service_role;
grant execute on function public.mfo_set_import_review_status(text, bigint, text) to service_role;
