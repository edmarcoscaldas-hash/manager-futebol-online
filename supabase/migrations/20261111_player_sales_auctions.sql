-- Vendas diretas entre clubes e leilões de jogadores.
-- Leilões duram 48 horas por padrão. Valores são pagos ao concluir a venda.

create table if not exists public.player_sale_offers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  seller_club_id uuid not null references public.clubs(id),
  buyer_club_id uuid not null references public.clubs(id),
  valor numeric(15,2) not null check (valor > 0),
  status text not null default 'pendente'
    check (status in ('pendente','aceita','recusada','cancelada')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists player_sale_offers_seller_idx
  on public.player_sale_offers (seller_club_id, status, created_at desc);
create index if not exists player_sale_offers_buyer_idx
  on public.player_sale_offers (buyer_club_id, status, created_at desc);

create table if not exists public.player_auctions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id),
  seller_club_id uuid not null references public.clubs(id),
  valor_inicial numeric(15,2) not null check (valor_inicial > 0),
  encerra_em timestamptz not null default (now() + interval '48 hours'),
  status text not null default 'ativo'
    check (status in ('ativo','vendido','sem_lances','cancelado')),
  vencedor_club_id uuid references public.clubs(id),
  valor_final numeric(15,2),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists player_auctions_seller_idx
  on public.player_auctions (seller_club_id, status, created_at desc);
create index if not exists player_auctions_end_idx
  on public.player_auctions (status, encerra_em);

create table if not exists public.player_auction_bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.player_auctions(id) on delete cascade,
  bidder_club_id uuid not null references public.clubs(id),
  valor numeric(15,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);

create index if not exists player_auction_bids_highest_idx
  on public.player_auction_bids (auction_id, valor desc, created_at asc);

alter table public.player_sale_offers enable row level security;
alter table public.player_auctions enable row level security;
alter table public.player_auction_bids enable row level security;

drop policy if exists player_sale_offers_participant_read on public.player_sale_offers;
create policy player_sale_offers_participant_read on public.player_sale_offers
for select to authenticated using (
  exists (select 1 from public.clubs c where c.id = seller_club_id and c.owner_id = auth.uid())
  or exists (select 1 from public.clubs c where c.id = buyer_club_id and c.owner_id = auth.uid())
);

drop policy if exists player_auctions_read_authenticated on public.player_auctions;
create policy player_auctions_read_authenticated on public.player_auctions
for select to authenticated using (true);

drop policy if exists player_auction_bids_read_authenticated on public.player_auction_bids;
create policy player_auction_bids_read_authenticated on public.player_auction_bids
for select to authenticated using (true);

create or replace function public.create_player_sale_offer(
  p_player_id uuid, p_buyer_club_id uuid, p_valor numeric
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_seller public.clubs%rowtype;
  v_buyer public.clubs%rowtype;
  v_player public.players%rowtype;
  v_id uuid;
begin
  select * into v_seller from public.clubs
  where owner_id = auth.uid() order by created_at limit 1;
  if not found then raise exception 'Clube vendedor não encontrado.'; end if;

  select * into v_buyer from public.clubs where id = p_buyer_club_id;
  if not found or v_buyer.id = v_seller.id then raise exception 'Selecione outro clube comprador.'; end if;

  select * into v_player from public.players where id = p_player_id for update;
  if not found or v_player.club_id <> v_seller.id or coalesce(v_player.is_youth,false) then
    raise exception 'Este jogador não pertence ao seu elenco profissional.';
  end if;
  if p_valor is null or p_valor <= 0 then raise exception 'Informe um valor válido.'; end if;
  if exists (select 1 from public.player_auctions a where a.player_id=p_player_id and a.status='ativo' and a.encerra_em>now()) then
    raise exception 'Este jogador já está em leilão.';
  end if;
  if exists (select 1 from public.player_sale_offers o where o.player_id=p_player_id and o.status='pendente') then
    raise exception 'Este jogador já possui uma proposta direta pendente.';
  end if;

  insert into public.player_sale_offers(player_id,seller_club_id,buyer_club_id,valor)
  values(p_player_id,v_seller.id,v_buyer.id,p_valor) returning id into v_id;
  return jsonb_build_object('offer_id',v_id,'message','Proposta de venda enviada ao clube comprador.');
end;
$$;

create or replace function public.respond_player_sale_offer(
  p_offer_id uuid, p_aceitar boolean
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_offer public.player_sale_offers%rowtype;
  v_buyer public.clubs%rowtype;
  v_seller public.clubs%rowtype;
  v_player public.players%rowtype;
begin
  select * into v_offer from public.player_sale_offers where id=p_offer_id for update;
  if not found or v_offer.status <> 'pendente' then raise exception 'Proposta não encontrada ou já respondida.'; end if;

  select * into v_buyer from public.clubs where id=v_offer.buyer_club_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Somente o clube comprador pode responder.'; end if;

  if not p_aceitar then
    update public.player_sale_offers set status='recusada',responded_at=now() where id=v_offer.id;
    return jsonb_build_object('status','recusada','message','Proposta recusada.');
  end if;

  select * into v_seller from public.clubs where id=v_offer.seller_club_id for update;
  select * into v_player from public.players where id=v_offer.player_id for update;
  if not found or v_player.club_id <> v_seller.id then raise exception 'O jogador não pertence mais ao clube vendedor.'; end if;
  if coalesce(v_buyer.orcamento,0) < v_offer.valor then raise exception 'Orçamento insuficiente para aceitar a proposta.'; end if;

  update public.clubs set orcamento=coalesce(orcamento,0)-v_offer.valor where id=v_buyer.id;
  update public.clubs set orcamento=coalesce(orcamento,0)+v_offer.valor where id=v_seller.id;
  update public.players set club_id=v_buyer.id,status_contrato='ativo',
    disponivel_transferencia=false,disponivel_emprestimo=false,
    emprestado_por_club_id=null,emprestimo_ate=null where id=v_player.id;
  update public.player_sale_offers set status='aceita',responded_at=now() where id=v_offer.id;
  update public.player_sale_offers set status='cancelada',responded_at=now()
    where player_id=v_player.id and id<>v_offer.id and status='pendente';

  return jsonb_build_object('status','aceita','message',v_player.nome || ' foi vendido e o valor entrou no caixa.');
end;
$$;

create or replace function public.create_player_auction(
  p_player_id uuid, p_valor_inicial numeric
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_seller public.clubs%rowtype;
  v_player public.players%rowtype;
  v_id uuid;
begin
  select * into v_seller from public.clubs
  where owner_id=auth.uid() order by created_at limit 1;
  if not found then raise exception 'Clube vendedor não encontrado.'; end if;
  select * into v_player from public.players where id=p_player_id for update;
  if not found or v_player.club_id<>v_seller.id or coalesce(v_player.is_youth,false) then
    raise exception 'Este jogador não pertence ao seu elenco profissional.';
  end if;
  if p_valor_inicial is null or p_valor_inicial<=0 then raise exception 'Informe um lance inicial válido.'; end if;
  if exists(select 1 from public.player_auctions where player_id=p_player_id and status='ativo' and encerra_em>now()) then
    raise exception 'Este jogador já está em leilão.';
  end if;
  if exists(select 1 from public.player_sale_offers where player_id=p_player_id and status='pendente') then
    raise exception 'Este jogador possui proposta direta pendente.';
  end if;
  insert into public.player_auctions(player_id,seller_club_id,valor_inicial)
  values(p_player_id,v_seller.id,p_valor_inicial) returning id into v_id;
  return jsonb_build_object('auction_id',v_id,'message','Leilão iniciado. Ele ficará aberto por 48 horas.');
end;
$$;

create or replace function public.place_player_auction_bid(
  p_auction_id uuid, p_valor numeric
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_auction public.player_auctions%rowtype;
  v_club public.clubs%rowtype;
  v_highest numeric;
begin
  select * into v_auction from public.player_auctions where id=p_auction_id for update;
  if not found or v_auction.status<>'ativo' or v_auction.encerra_em<=now() then
    raise exception 'Este leilão não está mais aberto.';
  end if;
  select * into v_club from public.clubs where owner_id=auth.uid() order by created_at limit 1 for update;
  if not found or v_club.id=v_auction.seller_club_id then raise exception 'O clube vendedor não pode dar lance.'; end if;
  select max(valor) into v_highest from public.player_auction_bids where auction_id=v_auction.id;
  if p_valor is null or p_valor < greatest(v_auction.valor_inicial,coalesce(v_highest,0)+1) then
    raise exception 'O lance deve superar o lance atual e atingir o valor inicial.';
  end if;
  if coalesce(v_club.orcamento,0)<p_valor then raise exception 'Orçamento insuficiente para esse lance.'; end if;
  insert into public.player_auction_bids(auction_id,bidder_club_id,valor)
  values(v_auction.id,v_club.id,p_valor);
  return jsonb_build_object('message','Lance registrado com sucesso.');
end;
$$;

create or replace function public.close_expired_player_auctions()
returns integer
language plpgsql security definer set search_path = public
as $$
declare
  a record;
  b record;
  v_count integer:=0;
begin
  for a in select * from public.player_auctions
    where status='ativo' and encerra_em<=now() for update
  loop
    for b in select bid.*, c.orcamento from public.player_auction_bids bid
      join public.clubs c on c.id=bid.bidder_club_id
      where bid.auction_id=a.id
      order by bid.valor desc,bid.created_at asc
    loop
      if coalesce(b.orcamento,0)>=b.valor then
        update public.clubs set orcamento=coalesce(orcamento,0)-b.valor where id=b.bidder_club_id;
        update public.clubs set orcamento=coalesce(orcamento,0)+b.valor where id=a.seller_club_id;
        update public.players set club_id=b.bidder_club_id,status_contrato='ativo',
          disponivel_transferencia=false,disponivel_emprestimo=false,
          emprestado_por_club_id=null,emprestimo_ate=null where id=a.player_id and club_id=a.seller_club_id;
        update public.player_auctions set status='vendido',vencedor_club_id=b.bidder_club_id,
          valor_final=b.valor,finished_at=now() where id=a.id;
        exit;
      end if;
    end loop;
    if not exists(select 1 from public.player_auctions where id=a.id and status='vendido') then
      if exists(select 1 from public.player_auction_bids where auction_id=a.id) then
        update public.player_auctions set status='sem_lances',finished_at=now() where id=a.id;
      else
        update public.player_auctions set status='sem_lances',finished_at=now() where id=a.id;
      end if;
    end if;
    v_count:=v_count+1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.create_player_sale_offer(uuid,uuid,numeric) from public;
revoke all on function public.respond_player_sale_offer(uuid,boolean) from public;
revoke all on function public.create_player_auction(uuid,numeric) from public;
revoke all on function public.place_player_auction_bid(uuid,numeric) from public;
revoke all on function public.close_expired_player_auctions() from public;
grant execute on function public.create_player_sale_offer(uuid,uuid,numeric) to authenticated;
grant execute on function public.respond_player_sale_offer(uuid,boolean) to authenticated;
grant execute on function public.create_player_auction(uuid,numeric) to authenticated;
grant execute on function public.place_player_auction_bid(uuid,numeric) to authenticated;
grant execute on function public.close_expired_player_auctions() to authenticated;
