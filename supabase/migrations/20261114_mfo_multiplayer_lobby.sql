create table if not exists public.mfo_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 50),
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting','in_progress','finished')),
  max_participants integer not null default 4 check (max_participants between 2 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.mfo_room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mfo_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('coach','spectator')),
  club_id uuid references public.clubs(id) on delete set null,
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_id, user_id),
  check ((role = 'coach' and club_id is not null) or (role = 'spectator' and club_id is null))
);
create unique index if not exists mfo_room_one_coach_per_club on public.mfo_room_members(room_id, club_id) where role = 'coach';
create table if not exists public.mfo_room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mfo_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists mfo_room_members_room_idx on public.mfo_room_members(room_id);
create index if not exists mfo_room_messages_room_created_idx on public.mfo_room_messages(room_id, created_at);
alter table public.mfo_rooms enable row level security;
alter table public.mfo_room_members enable row level security;
alter table public.mfo_room_messages enable row level security;
create policy mfo_rooms_select_member on public.mfo_rooms for select to authenticated
using (exists (select 1 from public.mfo_room_members m where m.room_id = id and m.user_id = (select auth.uid())));
create policy mfo_room_members_select_member on public.mfo_room_members for select to authenticated
using (exists (select 1 from public.mfo_room_members mine where mine.room_id = room_id and mine.user_id = (select auth.uid())));
create policy mfo_room_messages_select_member on public.mfo_room_messages for select to authenticated
using (exists (select 1 from public.mfo_room_members m where m.room_id = room_id and m.user_id = (select auth.uid())));
create policy mfo_room_messages_insert_member on public.mfo_room_messages for insert to authenticated
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.mfo_room_members m where m.room_id = room_id and m.user_id = (select auth.uid())
));
create or replace function public.create_mfo_room(p_name text, p_club_id uuid)
returns table(room_id uuid, invite_code text)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_room_id uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Faça login para criar uma sala.'; end if;
  if not public.mfo_user_can_manage_club(p_club_id) then raise exception 'Você não pode comandar este clube.'; end if;
  if nullif(trim(p_name), '') is null or char_length(trim(p_name)) > 50 then raise exception 'Informe um nome de sala entre 3 e 50 caracteres.'; end if;
  loop
    v_code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.mfo_rooms r where r.invite_code = v_code);
  end loop;
  insert into public.mfo_rooms(name, invite_code, created_by) values (trim(p_name), v_code, auth.uid()) returning id into v_room_id;
  insert into public.mfo_room_members(room_id, user_id, role, club_id) values (v_room_id, auth.uid(), 'coach', p_club_id);
  return query select v_room_id, v_code;
end;
$$;
create or replace function public.join_mfo_room(p_invite_code text, p_role text default 'coach', p_club_id uuid default null)
returns uuid language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_room public.mfo_rooms%rowtype; v_count integer; v_coaches integer;
begin
  if auth.uid() is null then raise exception 'Faça login para entrar em uma sala.'; end if;
  if upper(trim(coalesce(p_role,''))) not in ('COACH','SPECTATOR') then raise exception 'Papel inválido.'; end if;
  select * into v_room from public.mfo_rooms where invite_code = upper(trim(coalesce(p_invite_code,''))) for update;
  if not found then raise exception 'Código de convite não encontrado.'; end if;
  if v_room.status <> 'waiting' then raise exception 'Esta sala não está mais aceitando participantes.'; end if;
  if exists (select 1 from public.mfo_room_members where room_id=v_room.id and user_id=auth.uid()) then return v_room.id; end if;
  select count(*), count(*) filter (where role='coach') into v_count, v_coaches from public.mfo_room_members where room_id=v_room.id;
  if v_count >= v_room.max_participants then raise exception 'A sala já está cheia.'; end if;
  if upper(p_role) = 'COACH' then
    if p_club_id is null or not public.mfo_user_can_manage_club(p_club_id) then raise exception 'Selecione um clube que você comanda.'; end if;
    if v_coaches >= 2 then raise exception 'Esta sala já tem os dois treinadores.'; end if;
    if exists (select 1 from public.mfo_room_members where room_id=v_room.id and role='coach' and club_id=p_club_id) then raise exception 'Este clube já está representado na sala.'; end if;
    insert into public.mfo_room_members(room_id,user_id,role,club_id) values(v_room.id,auth.uid(),'coach',p_club_id);
  else
    insert into public.mfo_room_members(room_id,user_id,role,club_id) values(v_room.id,auth.uid(),'spectator',null);
  end if;
  return v_room.id;
end;
$$;
create or replace function public.set_mfo_room_ready(p_room_id uuid, p_ready boolean)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  update public.mfo_room_members m set ready=coalesce(p_ready,false)
  where m.room_id=p_room_id and m.user_id=auth.uid() and m.role='coach'
    and exists (select 1 from public.mfo_rooms r where r.id=p_room_id and r.status='waiting');
  if not found then raise exception 'Somente um treinador da sala em espera pode alterar a confirmação.'; end if;
  return true;
end;
$$;
create or replace function public.leave_mfo_room(p_room_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Faça login.'; end if;
  delete from public.mfo_room_members where room_id=p_room_id and user_id=auth.uid();
  if not found then raise exception 'Você não participa desta sala.'; end if;
  if not exists (select 1 from public.mfo_room_members where room_id=p_room_id) then delete from public.mfo_rooms where id=p_room_id; end if;
  return true;
end;
$$;
create or replace function public.mfo_room_member_name(p_user_id uuid)
returns text language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(nullif(p.nome,''), 'Treinador') from public.profiles p where p.id=p_user_id $$;
revoke all on function public.create_mfo_room(text,uuid) from public, anon;
revoke all on function public.join_mfo_room(text,text,uuid) from public, anon;
revoke all on function public.set_mfo_room_ready(uuid,boolean) from public, anon;
revoke all on function public.leave_mfo_room(uuid) from public, anon;
revoke all on function public.mfo_room_member_name(uuid) from public, anon;
grant execute on function public.create_mfo_room(text,uuid) to authenticated;
grant execute on function public.join_mfo_room(text,text,uuid) to authenticated;
grant execute on function public.set_mfo_room_ready(uuid,boolean) to authenticated;
grant execute on function public.leave_mfo_room(uuid) to authenticated;
grant execute on function public.mfo_room_member_name(uuid) to authenticated;
grant select on public.mfo_rooms, public.mfo_room_members, public.mfo_room_messages to authenticated;
grant insert on public.mfo_room_messages to authenticated;
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mfo_rooms') then alter publication supabase_realtime add table public.mfo_rooms; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mfo_room_members') then alter publication supabase_realtime add table public.mfo_room_members; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='mfo_room_messages') then alter publication supabase_realtime add table public.mfo_room_messages; end if;
end $$;