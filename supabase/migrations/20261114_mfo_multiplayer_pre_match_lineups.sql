create table if not exists public.mfo_room_lineups (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.mfo_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  formation text not null default '4-3-3',
  tactical_style text not null default 'balanced',
  mentality text not null default 'normal',
  starters jsonb not null default '[]'::jsonb,
  bench jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint mfo_room_lineups_room_user_key unique(room_id,user_id),
  constraint mfo_room_lineups_formation_check check (formation in ('4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2')),
  constraint mfo_room_lineups_style_check check (tactical_style in ('defensive','balanced','offensive')),
  constraint mfo_room_lineups_mentality_check check (mentality in ('very_defensive','defensive','normal','offensive','very_offensive')),
  constraint mfo_room_lineups_starters_array check (jsonb_typeof(starters)='array'),
  constraint mfo_room_lineups_bench_array check (jsonb_typeof(bench)='array')
);
alter table public.mfo_room_lineups enable row level security;
revoke all on public.mfo_room_lineups from anon, authenticated;
grant select on public.mfo_room_lineups to authenticated;
drop policy if exists "Room members can view room lineups" on public.mfo_room_lineups;
create policy "Room members can view room lineups" on public.mfo_room_lineups for select to authenticated using (public.mfo_user_is_room_member(room_id));
create or replace function public.save_mfo_room_lineup(p_room_id uuid,p_formation text,p_tactical_style text,p_mentality text,p_starters jsonb,p_bench jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_club uuid; v_role text; v_my_ready boolean; v_opponent_ready boolean; v_starter_count integer; v_bench_count integer; v_unique_count integer; v_selected jsonb;
begin
 if v_user is null then raise exception 'Faça login para salvar a escalação.'; end if;
 perform 1 from public.mfo_room_members where room_id=p_room_id and role='coach' for update;
 select club_id,role,ready into v_club,v_role,v_my_ready from public.mfo_room_members where room_id=p_room_id and user_id=v_user;
 if not found or v_role<>'coach' or v_club is null then raise exception 'Somente treinadores com clube definido podem montar a escalação.'; end if;
 select coalesce(bool_or(ready),false) into v_opponent_ready from public.mfo_room_members where room_id=p_room_id and role='coach' and user_id<>v_user;
 if v_my_ready or v_opponent_ready then raise exception 'A escalação está bloqueada após a confirmação de um dos treinadores.'; end if;
 if p_formation not in ('4-4-2','4-3-3','4-2-3-1','3-5-2','5-3-2') or p_tactical_style not in ('defensive','balanced','offensive') or p_mentality not in ('very_defensive','defensive','normal','offensive','very_offensive') then raise exception 'Configuração tática inválida.'; end if;
 if jsonb_typeof(p_starters)<>'array' or jsonb_typeof(p_bench)<>'array' then raise exception 'A escalação enviada é inválida.'; end if;
 v_starter_count:=jsonb_array_length(p_starters); v_bench_count:=jsonb_array_length(p_bench);
 if v_starter_count<>11 or v_bench_count>7 then raise exception 'A escalação precisa ter 11 titulares e até 7 reservas.'; end if;
 v_selected:=p_starters||p_bench;
 select count(distinct value) into v_unique_count from jsonb_array_elements_text(v_selected);
 if v_unique_count<>jsonb_array_length(v_selected) then raise exception 'Não é permitido repetir jogadores na escalação.'; end if;
 if exists(select 1 from jsonb_array_elements_text(v_selected) as selected(player_id) where not exists(select 1 from public.players p where p.id=selected.player_id::uuid and p.club_id=v_club and coalesce(p.is_youth,false)=false)) then raise exception 'Todos os jogadores devem pertencer ao elenco profissional do seu clube.'; end if;
 if not exists(select 1 from public.players p where p.id=(p_starters->>0)::uuid and p.club_id=v_club and lower(coalesce(p.posicao,'')) like '%goleiro%') then raise exception 'O primeiro titular precisa ser um goleiro.'; end if;
 insert into public.mfo_room_lineups(room_id,user_id,club_id,formation,tactical_style,mentality,starters,bench,updated_at)
 values(p_room_id,v_user,v_club,p_formation,p_tactical_style,p_mentality,p_starters,p_bench,now())
 on conflict(room_id,user_id) do update set club_id=excluded.club_id,formation=excluded.formation,tactical_style=excluded.tactical_style,mentality=excluded.mentality,starters=excluded.starters,bench=excluded.bench,updated_at=now();
end; $$;
revoke all on function public.save_mfo_room_lineup(uuid,text,text,text,jsonb,jsonb) from public,anon;
grant execute on function public.save_mfo_room_lineup(uuid,text,text,text,jsonb,jsonb) to authenticated;
do $$ begin alter publication supabase_realtime add table public.mfo_room_lineups; exception when duplicate_object then null; end $$;