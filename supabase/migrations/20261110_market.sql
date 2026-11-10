-- Manager Futebol Online - estrutura do Mercado de Transferências
-- Execute este arquivo no Supabase > SQL Editor.

-- Competições/ligas para permitir filtros por país, liga e divisão.
create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  pais text not null,
  divisao text not null default '1ª divisão',
  temporada integer not null default 1,
  created_at timestamptz not null default now(),
  unique (nome, pais, divisao, temporada)
);

alter table public.leagues enable row level security;
drop policy if exists leagues_read_authenticated on public.leagues;
create policy leagues_read_authenticated
on public.leagues for select to authenticated using (true);

alter table public.clubs
  add column if not exists league_id uuid references public.leagues(id);

-- Jogadores sem clube podem ser cadastrados como livres no mercado.
alter table public.players
  alter column club_id drop not null;

alter table public.players
  add column if not exists valor_mercado numeric(15,2) not null default 100000,
  add column if not exists is_star boolean not null default false,
  add column if not exists status_contrato text not null default 'ativo',
  add column if not exists contrato_ate date,
  add column if not exists potencial integer not null default 60,
  add column if not exists nacionalidade text,
  add column if not exists disponivel_transferencia boolean not null default false,
  add column if not exists disponivel_emprestimo boolean not null default false,
  add column if not exists emprestado_por_club_id uuid references public.clubs(id),
  add column if not exists emprestimo_ate date;

alter table public.players
  drop constraint if exists players_status_contrato_check;
alter table public.players
  add constraint players_status_contrato_check
  check (status_contrato in ('ativo', 'livre', 'emprestado'));

create index if not exists players_market_status_idx
  on public.players (status_contrato, overall desc);
create index if not exists players_market_position_idx
  on public.players (posicao);
create index if not exists players_market_nationality_idx
  on public.players (nacionalidade);
create index if not exists players_market_value_idx
  on public.players (valor_mercado);
create index if not exists players_market_transfer_idx
  on public.players (disponivel_transferencia, disponivel_emprestimo);
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
on public.player_offers for select to authenticated
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

-- O catálogo de jogadores poderá ser consultado por treinadores autenticados.
-- Ações de negociação serão executadas por funções protegidas em etapa posterior.
drop policy if exists players_market_read on public.players;
create policy players_market_read
on public.players for select to authenticated using (true);
