-- Patrocínio por temporada: três propostas e escolha única, sem edição manual.
create table if not exists public.sponsorship_offers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  temporada integer not null,
  empresa text not null,
  valor numeric(15,2) not null check (valor > 0),
  status text not null default 'ofertado'
    check (status in ('ofertado','aceito','recusado')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (club_id, temporada, empresa)
);

create index if not exists sponsorship_offers_club_season_idx
  on public.sponsorship_offers(club_id, temporada, created_at);

alter table public.sponsorship_offers enable row level security;
drop policy if exists sponsorship_offers_read_owner on public.sponsorship_offers;
create policy sponsorship_offers_read_owner on public.sponsorship_offers
for select to authenticated
using (exists (
  select 1 from public.clubs c
  where c.id=sponsorship_offers.club_id and c.owner_id=auth.uid()
));

create or replace function public.ensure_sponsorship_offers(p_club_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_club public.clubs%rowtype;
  v_temporada integer;
  v_media numeric;
  v_mult numeric:=1;
  v_count integer;
begin
  select * into v_club from public.clubs
  where id=p_club_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Clube não encontrado ou sem permissão.'; end if;

  select coalesce(l.temporada,1),
         case when l.divisao ilike '%2%' then 0.85 else 1 end
    into v_temporada,v_mult
  from public.leagues l where l.id=v_club.league_id;
  v_temporada:=coalesce(v_temporada,1);
  v_mult:=coalesce(v_mult,1);

  select coalesce(avg(overall),50) into v_media
  from public.players where club_id=p_club_id and coalesce(is_youth,false)=false;

  select count(*) into v_count from public.sponsorship_offers
  where club_id=p_club_id and temporada=v_temporada;

  if v_count=0 then
    insert into public.sponsorship_offers(club_id,temporada,empresa,valor)
    select p_club_id,v_temporada,x.empresa,
      round(greatest(50000, v_media * 3500 * v_mult * x.fator) / 1000) * 1000
    from (values
      ('Nexa Tecnologia'::text,1.00::numeric),
      ('Atlas Seguros',0.92),
      ('Veloz Telecom',1.12),
      ('Rede Max Atacado',0.86),
      ('Construtora Horizonte',1.18),
      ('Ápice Saúde',0.96),
      ('Nova Energia',1.08),
      ('Grupo União',1.03),
      ('Mobiliza Transportes',0.90)
    ) as x(empresa,fator)
    order by random()
    limit 3;
  end if;

  return jsonb_build_object('temporada',v_temporada);
end;
$$;

create or replace function public.accept_sponsorship_offer(p_offer_id uuid)
returns jsonb
language plpgsql security definer set search_path=public
as $$
declare
  v_offer public.sponsorship_offers%rowtype;
  v_club public.clubs%rowtype;
  v_current_season integer;
begin
  select * into v_offer from public.sponsorship_offers
  where id=p_offer_id for update;
  if not found or v_offer.status<>'ofertado' then
    raise exception 'Esta proposta não está mais disponível.';
  end if;

  select * into v_club from public.clubs
  where id=v_offer.club_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Clube não encontrado ou sem permissão.'; end if;

  select coalesce(l.temporada,1) into v_current_season
  from public.leagues l where l.id=v_club.league_id;
  v_current_season:=coalesce(v_current_season,1);

  if v_offer.temporada<>v_current_season then
    raise exception 'Esta proposta pertence a uma temporada anterior.';
  end if;
  if exists(select 1 from public.sponsorship_offers
    where club_id=v_club.id and temporada=v_current_season and status='aceito') then
    raise exception 'Seu clube já escolheu um patrocinador nesta temporada.';
  end if;

  update public.clubs
  set orcamento=coalesce(orcamento,0)+v_offer.valor
  where id=v_club.id;

  insert into public.financial_transactions(club_id,tipo,categoria,descricao,valor)
  values(v_club.id,'receita','Patrocínio',
    'Patrocínio da temporada '||v_current_season||' - '||v_offer.empresa,
    v_offer.valor);

  update public.sponsorship_offers
  set status=case when id=v_offer.id then 'aceito' else 'recusado' end,
      accepted_at=case when id=v_offer.id then now() else null end
  where club_id=v_club.id and temporada=v_current_season and status='ofertado';

  return jsonb_build_object(
    'success',true,
    'message','Patrocínio fechado com '||v_offer.empresa||'. Valor creditado automaticamente ao caixa.',
    'empresa',v_offer.empresa,
    'valor',v_offer.valor
  );
end;
$$;

revoke all on function public.ensure_sponsorship_offers(uuid) from public;
revoke all on function public.accept_sponsorship_offer(uuid) from public;
grant execute on function public.ensure_sponsorship_offers(uuid) to authenticated;
grant execute on function public.accept_sponsorship_offer(uuid) to authenticated;
