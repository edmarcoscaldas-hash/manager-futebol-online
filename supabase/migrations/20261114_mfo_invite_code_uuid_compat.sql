create or replace function public.create_mfo_room(p_name text, p_club_id uuid)
returns table(room_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_room_id uuid;
  v_code text;
begin
  if auth.uid() is null then raise exception 'Faça login para criar uma sala.'; end if;
  if not public.mfo_user_can_manage_club(p_club_id) then raise exception 'Você não pode comandar este clube.'; end if;
  if nullif(trim(p_name), '') is null or char_length(trim(p_name)) > 50 then raise exception 'Informe um nome de sala entre 3 e 50 caracteres.'; end if;
  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.mfo_rooms r where r.invite_code = v_code);
  end loop;
  insert into public.mfo_rooms(name, invite_code, created_by)
  values (trim(p_name), v_code, auth.uid())
  returning id into v_room_id;
  insert into public.mfo_room_members(room_id, user_id, role, club_id)
  values (v_room_id, auth.uid(), 'coach', p_club_id);
  return query select v_room_id, v_code;
end;
$$;