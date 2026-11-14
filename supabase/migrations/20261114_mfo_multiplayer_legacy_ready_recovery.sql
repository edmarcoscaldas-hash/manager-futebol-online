create or replace function public.set_mfo_room_ready(p_room_id uuid,p_ready boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_user uuid:=auth.uid(); v_role text; v_opponent_ready boolean; v_has_lineups boolean;
begin
 if v_user is null then raise exception 'Faça login.'; end if;
 perform 1 from public.mfo_room_members where room_id=p_room_id and role='coach' for update;
 select role into v_role from public.mfo_room_members where room_id=p_room_id and user_id=v_user;
 if not found or v_role<>'coach' then raise exception 'Somente treinadores da sala podem confirmar a escalação.'; end if;
 if not exists(select 1 from public.mfo_rooms where id=p_room_id and status='waiting') then raise exception 'Esta sala não está mais recebendo confirmações.'; end if;
 select coalesce(bool_or(ready),false) into v_opponent_ready from public.mfo_room_members where room_id=p_room_id and role='coach' and user_id<>v_user;
 select exists(select 1 from public.mfo_room_lineups where room_id=p_room_id) into v_has_lineups;
 if v_opponent_ready and not coalesce(p_ready,false) and v_has_lineups then raise exception 'O adversário já confirmou. A escalação está bloqueada.'; end if;
 if coalesce(p_ready,false) and not exists(select 1 from public.mfo_room_lineups where room_id=p_room_id and user_id=v_user) then raise exception 'Salve sua escalação antes de confirmar.'; end if;
 update public.mfo_room_members set ready=coalesce(p_ready,false) where room_id=p_room_id and user_id=v_user and role='coach';
 return true;
end; $$;
revoke all on function public.set_mfo_room_ready(uuid,boolean) from public,anon;
grant execute on function public.set_mfo_room_ready(uuid,boolean) to authenticated;