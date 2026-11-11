-- Contratos profissionais, vencimento automático e renovação salarial.
-- Prazo padrão de contratos novos: 6 meses.

alter table public.players
  alter column contrato_ate set default (current_date + interval '6 months')::date;

-- Jogadores já cadastrados sem prazo recebem contrato inicial de 6 meses.
update public.players
set contrato_ate = (current_date + interval '6 months')::date
where contrato_ate is null
  and club_id is not null
  and coalesce(status_contrato, 'ativo') = 'ativo';

create or replace function public.process_expired_player_contracts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.players
  set club_id = null,
      status_contrato = 'livre',
      salario_mensal = 0,
      contrato_ate = null,
      disponivel_transferencia = false,
      disponivel_emprestimo = false
  where status_contrato = 'ativo'
    and club_id is not null
    and contrato_ate is not null
    and contrato_ate <= current_date
    and coalesce(is_youth, false) = false;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.process_expired_player_contracts() from public;
grant execute on function public.process_expired_player_contracts() to authenticated;

create or replace function public.renew_player_contract(
  p_player_id uuid,
  p_duracao_meses integer,
  p_salario_mensal numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players%rowtype;
  v_club public.clubs%rowtype;
  v_salario_minimo numeric(12,2);
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar conectado para renovar contratos.';
  end if;

  if p_duracao_meses not in (6, 12, 24) then
    raise exception 'O contrato deve ter duração de 6, 12 ou 24 meses.';
  end if;

  if p_salario_mensal is null or p_salario_mensal <= 0 then
    raise exception 'Informe um salário mensal válido.';
  end if;

  select * into v_player
  from public.players
  where id = p_player_id
  for update;

  if not found or v_player.club_id is null or v_player.status_contrato <> 'ativo' then
    raise exception 'Este jogador não possui contrato ativo com seu clube.';
  end if;

  if v_player.contrato_ate is not null and v_player.contrato_ate <= current_date then
    raise exception 'O contrato já venceu. O jogador está livre no mercado.';
  end if;

  select * into v_club
  from public.clubs
  where id = v_player.club_id
    and owner_id = auth.uid()
  for update;

  if not found then
    raise exception 'Somente o clube proprietário pode renovar este contrato.';
  end if;

  v_salario_minimo := greatest(
    round(coalesce(v_player.salario_mensal, 0) * 1.10),
    round(
      3000 * power(
        greatest(40, least(100, coalesce(v_player.overall, 50)))::numeric / 50,
        3.6
      ) * case when coalesce(v_player.is_star, false) then 1.25 else 1 end
    )
  );

  if p_salario_mensal < v_salario_minimo then
    return jsonb_build_object(
      'status', 'contraproposta',
      'salario_esperado', v_salario_minimo,
      'message', v_player.nome || ' recusou a renovação e exige aumento salarial.'
    );
  end if;

  update public.players
  set salario_mensal = p_salario_mensal,
      contrato_ate = (current_date + make_interval(months => p_duracao_meses))::date
  where id = p_player_id;

  return jsonb_build_object(
    'status', 'renovado',
    'salario_mensal', p_salario_mensal,
    'contrato_ate', (current_date + make_interval(months => p_duracao_meses))::date,
    'message', 'Contrato de ' || v_player.nome || ' renovado por ' || p_duracao_meses || ' meses.'
  );
end;
$$;

revoke all on function public.renew_player_contract(uuid, integer, numeric) from public;
grant execute on function public.renew_player_contract(uuid, integer, numeric) to authenticated;

-- Ao contratar um jogador livre, ele recebe automaticamente um contrato de 6 meses.
create or replace function public.assign_initial_player_contract()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if NEW.status_contrato = 'ativo'
     and NEW.club_id is not null
     and NEW.contrato_ate is null then
    NEW.contrato_ate := (current_date + interval '6 months')::date;
  end if;
  return NEW;
end;
$$;

drop trigger if exists players_initial_contract_trigger on public.players;
create trigger players_initial_contract_trigger
before insert or update
on public.players
for each row
execute function public.assign_initial_player_contract();
