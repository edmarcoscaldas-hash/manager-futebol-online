-- Manager Futebol Online - primeira etapa do Mercado de Transferências
-- Execute este arquivo no Supabase > SQL Editor.
-- Esta migração prepara jogadores livres, estrelas e propostas. A lógica de temporada
-- será conectada ao calendário do jogo em uma etapa seguinte.

alter table public.players
  alter column club_id drop not null;

alter table public.players
  add column if not exists valor_mercado numeric(15,2) not null default 100000,
  add column if not exists is_star boolean not null default false,
  add column if not exists status_contrato text not null default 'ativo',
  add column if not exists contrato_ate date,
  add column if not exists potencial integer not null default 60,
  add column if not exists emprestado_por_club_id uuid references public.clubs(id),
  add column if not exists emprestimo_ate date;

alter table public.players
  drop constraint if exists players_status_contrato_check;

alter table public.players
  add constraint players_status_contrato_check
  check (status_contrato in ('ativo', 'livre', 'emprestado'));

create index if not exists players_market_status_idx
  on public.players (status_contrato, overall desc);

create index if not exists players_club_id_idx
  on public.players (club_id);

create table if not exists public.player_offers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  buyer_club_id uuid not null references public.clubs(id) on delete cascade,
  seller_club_id uuid references public.clubs(id) on delete set null,
  tipo text not null check (tipo in ('compra', 'emprestimo')),
  valor numeric(15,2) not null default 0 check (valor >= 0),
  duracao_meses integer not null default 0 check (duracao_meses between 0 and 24),
  status text not null default 'pendente'
    check (status in ('pendente', 'aceita', 'recusada', 'cancelada')),
  mensagem text,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists player_offers_player_idx
  on public.player_offers (player_id, status);

create index if not exists player_offers_buyer_idx
  on public.player_offers (buyer_club_id, created_at desc);

alter table public.player_offers enable row level security;

drop policy if exists player_offers_read_participant on public.player_offers;
create policy player_offers_read_participant
on public.player_offers for select
to authenticated
using (
  exists (
    select 1 from public.clubs c
    where c.id = buyer_club_id and c.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.clubs c
    where c.id = seller_club_id and c.owner_id = auth.uid()
  )
);

-- O catálogo pode ser consultado por usuários autenticados. Ações de compra e
-- resposta a propostas serão feitas por funções protegidas, não por edição direta.

drop policy if exists players_market_read on public.players;
create policy players_market_read
on public.players for select
to authenticated
using (true);

-- Permite que o dono do clube veja seu próprio clube e os dados associados.
-- As políticas antigas de players continuam valendo para escrita; as operações
-- de mercado serão centralizadas em funções transacionais na próxima migração.
