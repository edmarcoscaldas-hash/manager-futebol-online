create or replace function public.mfo_user_is_room_member(p_room_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1 from public.mfo_room_members m where m.room_id = p_room_id and m.user_id = auth.uid()
  );
$$;
revoke all on function public.mfo_user_is_room_member(uuid) from public, anon;
grant execute on function public.mfo_user_is_room_member(uuid) to authenticated;
drop policy if exists mfo_rooms_select_member on public.mfo_rooms;
create policy mfo_rooms_select_member on public.mfo_rooms for select to authenticated
using (public.mfo_user_is_room_member(mfo_rooms.id));
drop policy if exists mfo_room_members_select_member on public.mfo_room_members;
create policy mfo_room_members_select_member on public.mfo_room_members for select to authenticated
using (public.mfo_user_is_room_member(mfo_room_members.room_id));
drop policy if exists mfo_room_messages_select_member on public.mfo_room_messages;
create policy mfo_room_messages_select_member on public.mfo_room_messages for select to authenticated
using (public.mfo_user_is_room_member(mfo_room_messages.room_id));
drop policy if exists mfo_room_messages_insert_member on public.mfo_room_messages;
create policy mfo_room_messages_insert_member on public.mfo_room_messages for insert to authenticated
with check (user_id = (select auth.uid()) and public.mfo_user_is_room_member(mfo_room_messages.room_id));
drop function if exists public.mfo_room_member_name(uuid);