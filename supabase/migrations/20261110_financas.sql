-- Manager Futebol Online - modulo financeiro
-- Execute este arquivo no Supabase > SQL Editor.

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  descricao text,
  valor numeric(15,2) not null check (valor > 0),
  created_at timestamptz not null default now()
);

create index if not exists financial_transactions_club_date_idx
  on public.financial_transactions (club_id, created_at desc);

alter table public.financial_transactions enable row level security;

drop policy if exists financial_transactions_read_owner
  on public.financial_transactions;

create policy financial_transactions_read_owner
on public.financial_transactions
for select
to authenticated
using (
  exists (
    select 1
    from public.clubs c
    where c.id = financial_transactions.club_id
      and c.owner_id = auth.uid()
  )
);

create or replace function public.register_financial_transaction(
  p_tipo text,
  p_categoria text,
  p_descricao text,
  p_valor numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_saldo numeric(15,2);
  v_novo_saldo numeric(15,2);
begin
  if auth.uid() is null then
    raise exception 'Você precisa estar conectado.';
  end if;

  if p_tipo not in ('receita', 'despesa') then
    raise exception 'Tipo de movimentação inválido.';
  end if;

  if p_categoria is null or length(trim(p_categoria)) = 0 then
    raise exception 'Informe uma categoria.';
  end if;

  if p_valor is null or p_valor <= 0 then
    raise exception 'O valor precisa ser maior que zero.';
  end if;

  select c.id, coalesce(c.orcamento, 0)
    into v_club_id, v_saldo
  from public.clubs c
  where c.owner_id = auth.uid()
  order by c.created_at asc
  limit 1
  for update;

  if v_club_id is null then
    raise exception 'Nenhum clube foi encontrado para esta conta.';
  end if;

  if p_tipo = 'despesa' and v_saldo < p_valor then
    raise exception 'Saldo insuficiente para registrar essa despesa.';
  end if;

  if p_tipo = 'receita' then
    v_novo_saldo := v_saldo + p_valor;
  else
    v_novo_saldo := v_saldo - p_valor;
  end if;

  update public.clubs
  set orcamento = v_novo_saldo
  where id = v_club_id;

  insert into public.financial_transactions (
    club_id, tipo, categoria, descricao, valor
  ) values (
    v_club_id,
    p_tipo,
    trim(p_categoria),
    nullif(trim(coalesce(p_descricao, '')), ''),
    p_valor
  );

  return jsonb_build_object(
    'success', true,
    'message', case when p_tipo = 'receita'
      then 'Receita registrada e adicionada ao caixa.'
      else 'Despesa registrada e descontada do caixa.'
    end,
    'novo_saldo', v_novo_saldo
  );
end;
$$;

revoke all on function public.register_financial_transaction(text, text, text, numeric) from public;
grant execute on function public.register_financial_transaction(text, text, text, numeric) to authenticated;
