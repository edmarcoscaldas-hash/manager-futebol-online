-- Reputação do treinador perante diretoria, jogadores e torcida.
-- Execute uma única vez no Supabase SQL Editor.
alter table public.clubs
  add column if not exists reputacao_diretoria integer not null default 50,
  add column if not exists reputacao_jogadores integer not null default 50,
  add column if not exists reputacao_torcida integer not null default 50;

alter table public.clubs
  add constraint clubs_reputacao_diretoria_range
    check (reputacao_diretoria between 0 and 100),
  add constraint clubs_reputacao_jogadores_range
    check (reputacao_jogadores between 0 and 100),
  add constraint clubs_reputacao_torcida_range
    check (reputacao_torcida between 0 and 100);
