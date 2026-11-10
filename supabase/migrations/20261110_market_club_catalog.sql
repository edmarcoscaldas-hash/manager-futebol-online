-- Permite que treinadores autenticados vejam nome, país e liga dos clubes
-- para usar os filtros do mercado. Escrita continua protegida pelas políticas existentes.
alter table public.clubs enable row level security;
drop policy if exists clubs_market_catalog_read on public.clubs;
create policy clubs_market_catalog_read
on public.clubs for select to authenticated
using (true);
