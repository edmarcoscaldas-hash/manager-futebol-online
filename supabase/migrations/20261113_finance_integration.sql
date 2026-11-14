-- MFO: integração financeira segura e idempotente
-- Executar uma única vez no Supabase SQL Editor.
-- Não apaga clubes, jogadores, carreiras, partidas ou movimentações existentes.

create table if not exists public.club_financial_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  ticket_price numeric(10,2) not null default 50,
  updated_at timestamptz not null default now(),
  constraint club_financial_settings_ticket_price_check check (ticket_price between 10 and 1000)
);

create table if not exists public.financial_event_keys (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  event_key text not null,
  created_at timestamptz not null default now(),
  unique (club_id, event_key)
);

alter table public.club_financial_settings enable row level security;
alter table public.financial_event_keys enable row level security;
revoke all on public.financial_event_keys from anon, authenticated;
revoke all on public.club_financial_settings from anon, authenticated;
grant select on public.club_financial_settings to authenticated;

create or replace function public.mfo_user_can_manage_club(p_club_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.clubs c
    where c.id = p_club_id and c.owner_id = auth.uid()
  ) or exists (
    select 1
    from public.manager_employments me
    join public.manager_careers mc on mc.id = me.career_id
    where me.club_id = p_club_id
      and mc.user_id = auth.uid()
      and mc.status = 'active'
      and me.status = 'active'
      and me.ended_at is null
  );
$$;

drop policy if exists club_financial_settings_read on public.club_financial_settings;
create policy club_financial_settings_read
on public.club_financial_settings for select to authenticated
using (public.mfo_user_can_manage_club(club_id));

create or replace function public.mfo_post_financial_event(
  p_club_id uuid,
  p_event_key text,
  p_tipo text,
  p_categoria text,
  p_descricao text,
  p_valor numeric
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_valor is null or p_valor <= 0 then return false; end if;
  if p_tipo not in ('receita','despesa') then
    raise exception 'Tipo financeiro inválido.';
  end if;

  insert into public.financial_event_keys(club_id,event_key)
  values(p_club_id,p_event_key)
  on conflict (club_id,event_key) do nothing;

  if not found then return false; end if;

  update public.clubs
  set orcamento = coalesce(orcamento,0) +
    case when p_tipo='receita' then p_valor else -p_valor end
  where id=p_club_id;

  insert into public.financial_transactions(club_id,tipo,categoria,descricao,valor)
  values(p_club_id,p_tipo,p_categoria,p_descricao,p_valor);

  return true;
end;
$$;

create or replace function public.set_club_ticket_price(
  p_club_id uuid,
  p_ticket_price numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.mfo_user_can_manage_club(p_club_id) then
    raise exception 'Clube não encontrado ou sem permissão.';
  end if;
  if p_ticket_price is null or p_ticket_price < 10 or p_ticket_price > 1000 then
    raise exception 'O preço do ingresso deve ficar entre R$ 10 e R$ 1.000.';
  end if;

  insert into public.club_financial_settings(club_id,ticket_price)
  values(p_club_id,round(p_ticket_price,2))
  on conflict (club_id) do update
    set ticket_price=excluded.ticket_price, updated_at=now();

  return jsonb_build_object('success',true,'ticket_price',round(p_ticket_price,2));
end;
$$;

create or replace function public.get_financial_summary(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_receitas numeric(15,2);
  v_despesas numeric(15,2);
  v_count bigint;
  v_price numeric(10,2);
begin
  if auth.uid() is null or not public.mfo_user_can_manage_club(p_club_id) then
    raise exception 'Clube não encontrado ou sem permissão.';
  end if;

  select
    coalesce(sum(valor) filter (where tipo='receita'),0),
    coalesce(sum(valor) filter (where tipo='despesa'),0),
    count(*)
  into v_receitas,v_despesas,v_count
  from public.financial_transactions
  where club_id=p_club_id;

  select ticket_price into v_price
  from public.club_financial_settings where club_id=p_club_id;

  return jsonb_build_object(
    'receitas',v_receitas,
    'despesas',v_despesas,
    'total_movimentacoes',v_count,
    'ticket_price',coalesce(v_price,50)
  );
end;
$$;

create or replace function public.start_stadium_upgrade(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club public.clubs%rowtype;
  v_level integer;
  v_capacity integer;
  v_cost numeric;
  v_now timestamptz := now();
begin
  if auth.uid() is null or not public.mfo_user_can_manage_club(p_club_id) then
    raise exception 'Clube não encontrado ou sem permissão.';
  end if;

  select * into v_club from public.clubs where id=p_club_id for update;
  if v_club.stadium_upgrade_finishes_at is not null then
    raise exception 'Já existe uma ampliação em andamento.';
  end if;

  v_level := coalesce(v_club.stadium_level,1);
  if v_level=1 then v_capacity:=20000; v_cost:=500000;
  elsif v_level=2 then v_capacity:=40000; v_cost:=1500000;
  elsif v_level=3 then v_capacity:=70000; v_cost:=3000000;
  else raise exception 'Seu estádio já atingiu o nível máximo.'; end if;

  if coalesce(v_club.orcamento,0) < v_cost then
    raise exception 'Saldo insuficiente para iniciar a ampliação.';
  end if;

  update public.clubs
  set stadium_target_capacity=v_capacity,
      stadium_upgrade_started_at=v_now,
      stadium_upgrade_finishes_at=v_now + interval '10 days'
  where id=p_club_id;

  perform public.mfo_post_financial_event(
    p_club_id,
    'stadium-upgrade:'||v_level::text,
    'despesa','Estádio',
    'Ampliação do estádio para '||v_capacity||' lugares',
    v_cost
  );

  return jsonb_build_object('success',true,'capacity',v_capacity,'cost',v_cost,
    'finishes_at',v_now + interval '10 days');
end;
$$;

create or replace function public.register_financial_transaction(
  p_tipo text,
  p_categoria text,
  p_descricao text,
  p_valor numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club public.clubs%rowtype;
begin
  if auth.uid() is null then raise exception 'Você precisa estar conectado.'; end if;
  if p_tipo not in ('receita','despesa') then raise exception 'Tipo de movimentação inválido.'; end if;
  if p_categoria is null or length(trim(p_categoria))=0 then raise exception 'Informe uma categoria.'; end if;
  if p_valor is null or p_valor<=0 then raise exception 'O valor precisa ser maior que zero.'; end if;

  select c.* into v_club
  from public.manager_employments me
  join public.manager_careers mc on mc.id=me.career_id
  join public.clubs c on c.id=me.club_id
  where mc.user_id=auth.uid() and mc.status='active'
    and me.status='active' and me.ended_at is null
  order by me.started_at desc limit 1 for update of c;

  if not found then
    select * into v_club from public.clubs
    where owner_id=auth.uid() order by created_at asc limit 1 for update;
  end if;
  if not found then raise exception 'Nenhum clube foi encontrado para esta conta.'; end if;
  if p_tipo='despesa' and coalesce(v_club.orcamento,0)<p_valor then
    raise exception 'Saldo insuficiente para registrar essa despesa.';
  end if;

  update public.clubs
  set orcamento=coalesce(orcamento,0)+case when p_tipo='receita' then p_valor else -p_valor end
  where id=v_club.id;

  insert into public.financial_transactions(club_id,tipo,categoria,descricao,valor)
  values(v_club.id,p_tipo,trim(p_categoria),nullif(trim(coalesce(p_descricao,'')),''),p_valor);

  return jsonb_build_object('success',true,'novo_saldo',
    coalesce(v_club.orcamento,0)+case when p_tipo='receita' then p_valor else -p_valor end);
end;
$$;

create or replace function public.ensure_sponsorship_offers(p_club_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_club public.clubs%rowtype;
  v_temporada integer;
  v_media numeric;
  v_mult numeric:=1;
  v_count integer;
begin
  if auth.uid() is null or not public.mfo_user_can_manage_club(p_club_id) then
    raise exception 'Clube não encontrado ou sem permissão.';
  end if;
  select * into v_club from public.clubs where id=p_club_id for update;

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
      round(greatest(50000,v_media*3500*v_mult*x.fator)/1000)*1000
    from (values
      ('Nexa Tecnologia'::text,1.00::numeric),
      ('Atlas Seguros',0.92),('Veloz Telecom',1.12),
      ('Rede Max Atacado',0.86),('Construtora Horizonte',1.18),
      ('Ápice Saúde',0.96),('Nova Energia',1.08),
      ('Grupo União',1.03),('Mobiliza Transportes',0.90)
    ) as x(empresa,fator)
    order by random() limit 3;
  end if;

  return jsonb_build_object('temporada',v_temporada);
end;
$$;

create or replace function public.accept_sponsorship_offer(p_offer_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_offer public.sponsorship_offers%rowtype;
  v_club public.clubs%rowtype;
  v_current_season integer;
begin
  select * into v_offer from public.sponsorship_offers where id=p_offer_id for update;
  if not found or v_offer.status<>'ofertado' then
    raise exception 'Esta proposta não está mais disponível.';
  end if;
  if auth.uid() is null or not public.mfo_user_can_manage_club(v_offer.club_id) then
    raise exception 'Clube não encontrado ou sem permissão.';
  end if;
  select * into v_club from public.clubs where id=v_offer.club_id for update;

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

  update public.clubs set orcamento=coalesce(orcamento,0)+v_offer.valor where id=v_club.id;
  insert into public.financial_transactions(club_id,tipo,categoria,descricao,valor)
  values(v_club.id,'receita','Patrocínio',
    'Patrocínio da temporada '||v_current_season||' - '||v_offer.empresa,v_offer.valor);

  update public.sponsorship_offers
  set status=case when id=v_offer.id then 'aceito' else 'recusado' end,
      accepted_at=case when id=v_offer.id then now() else null end
  where club_id=v_club.id and temporada=v_current_season and status='ofertado';

  return jsonb_build_object('success',true,
    'message','Patrocínio fechado com '||v_offer.empresa||'. Valor creditado automaticamente ao caixa.',
    'empresa',v_offer.empresa,'valor',v_offer.valor);
end;
$$;

create or replace function public.submit_player_offer(
  p_player_id uuid,
  p_tipo text,
  p_valor numeric default 0,
  p_duracao_meses integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_buyer public.clubs%rowtype;
  v_player public.players%rowtype;
  v_seller public.clubs%rowtype;
  v_status text;
  v_minimo numeric;
  v_offer_id uuid;
  v_mensagem text;
begin
  if auth.uid() is null then raise exception 'Você precisa estar conectado para negociar.'; end if;
  if p_tipo not in ('compra','emprestimo') then raise exception 'Tipo de negociação inválido.'; end if;
  if coalesce(p_valor,0)<0 then raise exception 'O valor da proposta não pode ser negativo.'; end if;
  if p_tipo='emprestimo' and (p_duracao_meses<1 or p_duracao_meses>24) then
    raise exception 'O empréstimo deve ter duração entre 1 e 24 meses.';
  end if;

  select c.* into v_buyer
  from public.manager_employments me
  join public.manager_careers mc on mc.id=me.career_id
  join public.clubs c on c.id=me.club_id
  where mc.user_id=auth.uid() and mc.status='active'
    and me.status='active' and me.ended_at is null
  order by me.started_at desc limit 1 for update of c;
  if not found then
    select * into v_buyer from public.clubs
    where owner_id=auth.uid() order by created_at asc limit 1 for update;
  end if;
  if not found then raise exception 'Crie seu clube antes de contratar jogadores.'; end if;

  select * into v_player from public.players where id=p_player_id for update;
  if not found then raise exception 'Jogador não encontrado.'; end if;
  if v_player.club_id=v_buyer.id then raise exception 'Esse jogador já pertence ao seu clube.'; end if;

  if v_player.status_contrato='livre' then
    if p_tipo<>'compra' then raise exception 'Jogadores livres recebem proposta de contratação, não de empréstimo.'; end if;
    if coalesce(p_valor,0)<>0 then raise exception 'A contratação de jogador livre não tem taxa de transferência.'; end if;
    insert into public.player_offers(player_id,buyer_club_id,seller_club_id,tipo,valor,duracao_meses,status,mensagem,responded_at)
    values(v_player.id,v_buyer.id,null,'compra',0,0,'aceita',
      'Jogador livre aceitou a proposta e assinou com seu clube.',now())
    returning id into v_offer_id;
    update public.players set club_id=v_buyer.id,status_contrato='ativo',
      disponivel_transferencia=false,disponivel_emprestimo=false,
      emprestado_por_club_id=null,emprestimo_ate=null
    where id=v_player.id;
    return jsonb_build_object('offer_id',v_offer_id,'status','aceita',
      'message',v_player.nome||' aceitou a proposta e agora faz parte do seu elenco.','player_id',v_player.id);
  end if;

  if v_player.club_id is null then raise exception 'Situação contratual do jogador inválida.'; end if;
  select * into v_seller from public.clubs where id=v_player.club_id for update;
  if not found then raise exception 'Clube vendedor não encontrado.'; end if;

  if p_tipo='compra' then
    if not coalesce(v_player.disponivel_transferencia,false) then
      raise exception 'Este jogador não está disponível para transferência.';
    end if;
    v_minimo:=greatest(1,coalesce(v_player.valor_mercado,0)*0.85);
    if p_valor<v_minimo then
      raise exception 'A proposta está abaixo do valor mínimo aceito pelo clube vendedor (85%% do valor de mercado).';
    end if;
    if coalesce(v_buyer.orcamento,0)<p_valor then
      raise exception 'Orçamento insuficiente para fazer essa contratação.';
    end if;
    update public.players set club_id=v_buyer.id,status_contrato='ativo',
      disponivel_transferencia=false,disponivel_emprestimo=false,
      emprestado_por_club_id=null,emprestimo_ate=null
    where id=v_player.id;
    v_status:='aceita';
    v_mensagem:='O clube vendedor aceitou a proposta. '||v_player.nome||' foi contratado.';
  else
    if not coalesce(v_player.disponivel_emprestimo,false) then
      raise exception 'Este jogador não está disponível para empréstimo.';
    end if;
    v_minimo:=greatest(1,coalesce(v_player.valor_mercado,0)*0.02);
    if p_valor<v_minimo then raise exception 'A proposta de empréstimo está abaixo do mínimo esperado pelo clube.'; end if;
    if coalesce(v_buyer.orcamento,0)<p_valor then
      raise exception 'Orçamento insuficiente para essa proposta de empréstimo.';
    end if;
    update public.players set club_id=v_buyer.id,status_contrato='emprestado',
      disponivel_transferencia=false,disponivel_emprestimo=false,
      emprestado_por_club_id=v_seller.id,
      emprestimo_ate=(current_date+make_interval(months=>p_duracao_meses))::date
    where id=v_player.id;
    v_status:='aceita';
    v_mensagem:='O clube vendedor aceitou o empréstimo de '||v_player.nome||' por '||p_duracao_meses||' meses.';
  end if;

  insert into public.player_offers(player_id,buyer_club_id,seller_club_id,tipo,valor,duracao_meses,status,mensagem,responded_at)
  values(v_player.id,v_buyer.id,v_seller.id,p_tipo,p_valor,p_duracao_meses,v_status,v_mensagem,now())
  returning id into v_offer_id;

  if p_valor>0 then
    perform public.mfo_post_financial_event(v_buyer.id,'player-offer:'||v_offer_id::text||':expense',
      'despesa',case when p_tipo='compra' then 'Transferência' else 'Empréstimo' end,
      case when p_tipo='compra' then 'Contratação de ' else 'Taxa de empréstimo de ' end||v_player.nome,p_valor);
    perform public.mfo_post_financial_event(v_seller.id,'player-offer:'||v_offer_id::text||':income',
      'receita',case when p_tipo='compra' then 'Venda de jogador' else 'Empréstimo' end,
      case when p_tipo='compra' then 'Venda de ' else 'Taxa de empréstimo recebida por ' end||v_player.nome,p_valor);
  end if;

  return jsonb_build_object('offer_id',v_offer_id,'status',v_status,'message',v_mensagem,'player_id',v_player.id);
end;
$$;

-- A versão de 5 parâmetros (salário) existente permanece compatível e continua chamando a função de 4 parâmetros.
-- A folha é lançada uma vez por clube/mês de calendário do jogo, no primeiro jogo concluído daquele mês.
create or replace function public.mfo_process_match_finances()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_month date;
  v_club_id uuid;
  v_payroll numeric(15,2);
  v_capacity integer;
  v_ticket numeric(10,2);
  v_avg_overall numeric;
  v_stars integer;
  v_attendance integer;
  v_gate numeric(15,2);
  v_shirts numeric(15,2);
begin
  if new.status <> 'finished' or old.status = 'finished' then
    return new;
  end if;

  v_month := date_trunc('month', coalesce(new.match_date::date, current_date)::timestamp)::date;

  foreach v_club_id in array array[new.home_club_id, new.away_club_id]
  loop
    select coalesce(sum(coalesce(nullif(p.salario_mensal, 0), p.salario, 0)), 0)
      into v_payroll
    from public.players p
    where p.club_id = v_club_id
      and coalesce(p.is_youth, false) = false
      and p.status_contrato in ('ativo', 'emprestado');

    perform public.mfo_post_financial_event(
      v_club_id,
      'payroll:' || to_char(v_month, 'YYYY-MM'),
      'despesa',
      'Salários',
      'Folha salarial mensal - ' || to_char(v_month, 'MM/YYYY'),
      v_payroll
    );
  end loop;

  select coalesce(c.capacidade, 10000), coalesce(s.ticket_price, 50)
    into v_capacity, v_ticket
  from public.clubs c
  left join public.club_financial_settings s on s.club_id = c.id
  where c.id = new.home_club_id;

  select coalesce(avg(p.overall), 50),
         count(*) filter (where coalesce(p.is_star, false))
    into v_avg_overall, v_stars
  from public.players p
  where p.club_id = new.home_club_id
    and coalesce(p.is_youth, false) = false;

  v_attendance := least(v_capacity, greatest(0, (v_capacity * 0.55)::integer));
  v_gate := round(v_attendance * v_ticket, 2);

  perform public.mfo_post_financial_event(
    new.home_club_id,
    'match-gate:' || new.id::text,
    'receita',
    'Bilheteria',
    'Bilheteria - partida em ' || to_char(v_month, 'MM/YYYY') ||
      ' (' || v_attendance || ' torcedores)',
    v_gate
  );

  v_shirts := round((v_capacity * 0.0015 + v_stars * 180 + v_avg_overall * 18), 2);
  perform public.mfo_post_financial_event(
    new.home_club_id,
    'match-shirts:' || new.id::text,
    'receita',
    'Venda de camisas',
    'Comercialização de camisas - partida em ' || to_char(v_month, 'MM/YYYY'),
    v_shirts
  );

  return new;
end;
$$;

drop trigger if exists mfo_match_finances_after_finish on public.matches;
create trigger mfo_match_finances_after_finish
after update of status on public.matches
for each row
when (new.status='finished' and old.status is distinct from new.status)
execute function public.mfo_process_match_finances();

drop policy if exists mfo_financial_transactions_select on public.financial_transactions;
create policy mfo_financial_transactions_select
on public.financial_transactions for select to authenticated
using (public.mfo_user_can_manage_club(club_id));

drop policy if exists mfo_sponsorship_offers_select on public.sponsorship_offers;
create policy mfo_sponsorship_offers_select
on public.sponsorship_offers for select to authenticated
using (public.mfo_user_can_manage_club(club_id));

revoke all on function public.mfo_post_financial_event(uuid,text,text,text,text,numeric) from public, anon, authenticated;
revoke all on function public.mfo_process_match_finances() from public, anon, authenticated;

grant execute on function public.mfo_user_can_manage_club(uuid) to authenticated;
grant execute on function public.set_club_ticket_price(uuid,numeric) to authenticated;
grant execute on function public.get_financial_summary(uuid) to authenticated;
grant execute on function public.start_stadium_upgrade(uuid) to authenticated;
grant execute on function public.register_financial_transaction(text,text,text,numeric) to authenticated;
grant execute on function public.ensure_sponsorship_offers(uuid) to authenticated;
grant execute on function public.accept_sponsorship_offer(uuid) to authenticated;
grant execute on function public.submit_player_offer(uuid,text,numeric,integer) to authenticated;

-- Verificação rápida após a execução:
select 'MFO finance migration installed' as status,
       to_regclass('public.club_financial_settings') as settings_table,
       to_regclass('public.financial_event_keys') as idempotency_table,
       (select count(*) from pg_trigger where tgname='mfo_match_finances_after_finish') as finance_trigger_count;
