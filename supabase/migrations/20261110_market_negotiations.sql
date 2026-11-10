-- Negociação funcional do Mercado de Transferências do Manager Futebol Online.
-- Execute no Supabase > SQL Editor após a migration 20261110_market.sql.

create or replace function public.submit_player_offer(
  p_player_id uuid,
  p_tipo text,
  p_valor numeric default 0,
  p_duracao_meses integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer public.clubs%rowtype;
  v_player public.players%rowtype;
  v_seller public.clubs%rowtype;
  v_status text;
  v_minimo numeric;
  v_offer_id uuid;
  v_novo_orcamento numeric;
  v_mensagem text;
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar conectado para negociar.';
  end if;

  if p_tipo not in ('compra', 'emprestimo') then
    raise exception 'Tipo de negociação inválido.';
  end if;

  if coalesce(p_valor, 0) < 0 then
    raise exception 'O valor da proposta não pode ser negativo.';
  end if;

  if p_tipo = 'emprestimo' and (p_duracao_meses < 1 or p_duracao_meses > 24) then
    raise exception 'O empréstimo deve ter duração entre 1 e 24 meses.';
  end if;

  select * into v_buyer
  from public.clubs
  where owner_id = auth.uid()
  order by created_at asc
  limit 1
  for update;

  if not found then
    raise exception 'Crie seu clube antes de contratar jogadores.';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if not found then
    raise exception 'Jogador não encontrado.';
  end if;

  if v_player.club_id = v_buyer.id then
    raise exception 'Esse jogador já pertence ao seu clube.';
  end if;

  if v_player.status_contrato = 'livre' then
    if p_tipo <> 'compra' then
      raise exception 'Jogadores livres recebem proposta de contratação, não de empréstimo.';
    end if;
    if coalesce(p_valor, 0) <> 0 then
      raise exception 'A contratação de jogador livre não tem taxa de transferência.';
    end if;

    insert into public.player_offers
      (player_id, buyer_club_id, seller_club_id, tipo, valor, duracao_meses, status, mensagem, responded_at)
    values
      (v_player.id, v_buyer.id, null, 'compra', 0, 0, 'aceita',
       'Jogador livre aceitou a proposta e assinou com seu clube.', now())
    returning id into v_offer_id;

    update public.players
    set club_id = v_buyer.id,
        status_contrato = 'ativo',
        disponivel_transferencia = false,
        disponivel_emprestimo = false,
        emprestado_por_club_id = null,
        emprestimo_ate = null
    where id = v_player.id;

    return jsonb_build_object('offer_id', v_offer_id, 'status', 'aceita',
      'message', v_player.nome || ' aceitou a proposta e agora faz parte do seu elenco.',
      'player_id', v_player.id);
  end if;

  if v_player.club_id is null then
    raise exception 'Situação contratual do jogador inválida.';
  end if;

  select * into v_seller
  from public.clubs
  where id = v_player.club_id
  for update;

  if p_tipo = 'compra' then
    if not coalesce(v_player.disponivel_transferencia, false) then
      raise exception 'Este jogador não está disponível para transferência.';
    end if;
    v_minimo := greatest(1, coalesce(v_player.valor_mercado, 0) * 0.85);
    if p_valor < v_minimo then
      raise exception 'A proposta está abaixo do valor mínimo aceito pelo clube vendedor (85%% do valor de mercado).';
    end if;
    if coalesce(v_buyer.orcamento, 0) < p_valor then
      raise exception 'Orçamento insuficiente para fazer essa contratação.';
    end if;

    update public.clubs set orcamento = coalesce(orcamento, 0) - p_valor where id = v_buyer.id;
    update public.clubs set orcamento = coalesce(orcamento, 0) + p_valor where id = v_seller.id;

    update public.players
    set club_id = v_buyer.id,
        status_contrato = 'ativo',
        disponivel_transferencia = false,
        disponivel_emprestimo = false,
        emprestado_por_club_id = null,
        emprestimo_ate = null
    where id = v_player.id;

    v_status := 'aceita';
    v_mensagem := 'O clube vendedor aceitou a proposta. ' || v_player.nome || ' foi contratado.';
  else
    if not coalesce(v_player.disponivel_emprestimo, false) then
      raise exception 'Este jogador não está disponível para empréstimo.';
    end if;
    v_minimo := greatest(1, coalesce(v_player.valor_mercado, 0) * 0.02);
    if p_valor < v_minimo then
      raise exception 'A proposta de empréstimo está abaixo do mínimo esperado pelo clube.';
    end if;
    if coalesce(v_buyer.orcamento, 0) < p_valor then
      raise exception 'Orçamento insuficiente para essa proposta de empréstimo.';
    end if;

    update public.clubs set orcamento = coalesce(orcamento, 0) - p_valor where id = v_buyer.id;

    update public.players
    set club_id = v_buyer.id,
        status_contrato = 'emprestado',
        disponivel_transferencia = false,
        disponivel_emprestimo = false,
        emprestado_por_club_id = v_seller.id,
        emprestimo_ate = (current_date + make_interval(months => p_duracao_meses))::date
    where id = v_player.id;

    v_status := 'aceita';
    v_mensagem := 'O clube vendedor aceitou o empréstimo de ' || v_player.nome || ' por ' || p_duracao_meses || ' meses.';
  end if;

  insert into public.player_offers
    (player_id, buyer_club_id, seller_club_id, tipo, valor, duracao_meses, status, mensagem, responded_at)
  values
    (v_player.id, v_buyer.id, v_seller.id, p_tipo, p_valor, p_duracao_meses, v_status, v_mensagem, now())
  returning id into v_offer_id;

  return jsonb_build_object('offer_id', v_offer_id, 'status', v_status,
    'message', v_mensagem, 'player_id', v_player.id);
end;
$$;

revoke all on function public.submit_player_offer(uuid, text, numeric, integer) from public;
grant execute on function public.submit_player_offer(uuid, text, numeric, integer) to authenticated;

-- Devolve automaticamente ao clube de origem os jogadores cujo empréstimo venceu.
create or replace function public.process_expired_player_loans()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.players
  set club_id = emprestado_por_club_id,
      status_contrato = 'ativo',
      emprestado_por_club_id = null,
      emprestimo_ate = null,
      disponivel_transferencia = false,
      disponivel_emprestimo = false
  where status_contrato = 'emprestado'
    and emprestimo_ate is not null
    and emprestimo_ate <= current_date
    and emprestado_por_club_id is not null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.process_expired_player_loans() from public;
grant execute on function public.process_expired_player_loans() to authenticated;
