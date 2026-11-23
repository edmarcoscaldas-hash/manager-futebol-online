-- Painel Master: auditoria e reset completo individual.
create table if not exists public.mfo_admin_audit (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null,
  target_user_id uuid not null,
  action text not null check (action in ('reset_complete_individual','block_user','unblock_user')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.mfo_admin_audit enable row level security;
revoke all on public.mfo_admin_audit from public, anon, authenticated;
grant all on public.mfo_admin_audit to service_role;

create or replace function public.mfo_admin_reset_user_game_data(p_target_user_id uuid, p_admin_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_club_ids uuid[];
  v_player_ids uuid[];
  v_match_ids uuid[];
  v_career_ids uuid[];
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then
    raise exception 'service_role_required';
  end if;
  if p_target_user_id is null then raise exception 'target_user_required'; end if;
  if p_admin_user_id is null then raise exception 'admin_user_required'; end if;
  if not exists (select 1 from auth.users where id = p_target_user_id and deleted_at is null) then
    raise exception 'target_user_not_found';
  end if;

  select coalesce(array_agg(id), '{}') into v_club_ids
  from public.clubs where owner_id = p_target_user_id;

  select coalesce(array_agg(id), '{}') into v_player_ids
  from public.players where club_id = any(v_club_ids);

  select coalesce(array_agg(id), '{}') into v_match_ids
  from public.matches where home_club_id = any(v_club_ids) or away_club_id = any(v_club_ids);

  select coalesce(array_agg(id), '{}') into v_career_ids
  from public.manager_careers where user_id = p_target_user_id;

  -- Remove dependent match records first; shared league fixtures involving this user's club are isolated.
  delete from public.match_events
   where match_id = any(v_match_ids) or club_id = any(v_club_ids)
      or player_id = any(v_player_ids) or related_player_id = any(v_player_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('match_events', v_count);

  delete from public.match_lineup_players
   where player_id = any(v_player_ids)
      or lineup_id in (select id from public.match_lineups where match_id = any(v_match_ids) or club_id = any(v_club_ids));
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('match_lineup_players', v_count);

  delete from public.match_lineups where match_id = any(v_match_ids) or club_id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('match_lineups', v_count);

  delete from public.club_pressure_events where club_id = any(v_club_ids) or match_id = any(v_match_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('club_pressure_events', v_count);

  delete from public.manager_interviews where club_id = any(v_club_ids) or match_id = any(v_match_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('manager_interviews', v_count);

  delete from public.manager_job_offers
   where club_id = any(v_club_ids) or source_match_id = any(v_match_ids) or career_id = any(v_career_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('manager_job_offers', v_count);

  delete from public.player_auction_bids
   where bidder_club_id = any(v_club_ids)
      or auction_id in (select id from public.player_auctions where player_id = any(v_player_ids) or seller_club_id = any(v_club_ids) or vencedor_club_id = any(v_club_ids));
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('player_auction_bids', v_count);

  delete from public.player_auctions
   where player_id = any(v_player_ids) or seller_club_id = any(v_club_ids) or vencedor_club_id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('player_auctions', v_count);

  delete from public.player_sale_offers
   where player_id = any(v_player_ids) or seller_club_id = any(v_club_ids) or buyer_club_id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('player_sale_offers', v_count);

  delete from public.player_offers
   where player_id = any(v_player_ids) or seller_club_id = any(v_club_ids) or buyer_club_id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('player_offers', v_count);

  delete from public.manager_employments where club_id = any(v_club_ids) or career_id = any(v_career_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('manager_employments', v_count);

  delete from public.manager_offers where club_id = any(v_club_ids) or career_id = any(v_career_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('manager_offers', v_count);

  delete from public.matches where id = any(v_match_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('matches', v_count);

  -- Remove only the target user's multiplayer activity; keep shared rooms and other participants.
  delete from public.mfo_room_messages where user_id = p_target_user_id;
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('room_messages', v_count);
  delete from public.mfo_room_lineups where user_id = p_target_user_id or club_id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('room_lineups', v_count);
  delete from public.mfo_room_members where user_id = p_target_user_id or club_id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('room_memberships', v_count);

  -- Clear loans from the deleted club before deleting its players and club record.
  update public.players set emprestado_por_club_id = null, emprestimo_ate = null
   where emprestado_por_club_id = any(v_club_ids) and not (id = any(v_player_ids));

  delete from public.players where id = any(v_player_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('players', v_count);

  delete from public.clubs where id = any(v_club_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('clubs', v_count);

  delete from public.manager_careers where id = any(v_career_ids);
  get diagnostics v_count = row_count; v_deleted := v_deleted || jsonb_build_object('manager_careers', v_count);

  insert into public.mfo_admin_audit(admin_user_id, target_user_id, action, details)
  values (p_admin_user_id, p_target_user_id, 'reset_complete_individual',
          jsonb_build_object('deleted_counts', v_deleted, 'preserved_account', true));

  return jsonb_build_object('success', true, 'target_user_id', p_target_user_id,
    'preserved_account', true, 'deleted_counts', v_deleted);
end;
$$;

revoke all on function public.mfo_admin_reset_user_game_data(uuid,uuid) from public, anon, authenticated;
grant execute on function public.mfo_admin_reset_user_game_data(uuid,uuid) to service_role;
