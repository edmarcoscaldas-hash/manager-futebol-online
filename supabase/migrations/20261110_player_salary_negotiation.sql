-- Salários individuais e contraproposta nas negociações do MFO.
alter table public.players
  add column if not exists salario_mensal numeric(12,2) not null default 0;

alter table public.player_offers
  add column if not exists salario_ofertado numeric(12,2) not null default 0;

create or replace function public.submit_player_offer(
  p_player_id uuid,
  p_tipo text,
  p_valor numeric default 0,
  p_duracao_meses integer default 0,
  p_salario_mensal numeric default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_result jsonb;
  v_salario_esperado numeric(12,2);
  v_salario_aceitavel numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar conectado para negociar.';
  end if;

  if coalesce(p_salario_mensal, 0) <= 0 then
    raise exception 'Informe uma proposta salarial mensal maior que zero.';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if not found then
    raise exception 'Jogador não encontrado.';
  end if;

  -- Exigência cresce de forma progressiva conforme o Overall.
  v_salario_esperado := round(
    3000 * power(greatest(40, least(100, coalesce(v_player.overall, 50)))::numeric / 50, 3.6)
    * case when coalesce(v_player.is_star, false) then 1.25 else 1 end
  );
  v_salario_aceitavel := round(v_salario_esperado * 0.90);

  if p_salario_mensal < v_salario_aceitavel then
    return jsonb_build_object(
      'status', 'contraproposta',
      'message', v_player.nome || ' recusou a oferta inicial e pede R$ ' ||
        to_char(v_salario_esperado, 'FM999G999G990D00') || ' por mês.',
      'salario_esperado', v_salario_esperado,
      'salario_ofertado', p_salario_mensal
    );
  end if;

  v_result := public.submit_player_offer(
    p_player_id, p_tipo, p_valor, p_duracao_meses
  );

  if coalesce(v_result->>'status', '') = 'aceita' then
    update public.players
    set salario_mensal = p_salario_mensal
    where id = p_player_id;

    update public.player_offers
    set salario_ofertado = p_salario_mensal
    where id = (v_result->>'offer_id')::uuid;
    v_result := v_result || jsonb_build_object(
      'salario_mensal', p_salario_mensal,
      'message', coalesce(v_result->>'message', 'Negociação concluída.') ||
        ' Salário acordado: R$ ' || to_char(p_salario_mensal, 'FM999G999G990D00') || ' por mês.'
    );
  end if;

  return v_result;
end;
$$;

revoke all on function public.submit_player_offer(uuid, text, numeric, integer, numeric) from public;
grant execute on function public.submit_player_offer(uuid, text, numeric, integer, numeric) to authenticated;
