-- MFO | EXPORTACAO DE AUDITORIA PARA RECONCILIACAO DE CLUBES E ELENCOS
-- SOMENTE LEITURA: execute no Supabase SQL Editor.
-- Nao executa INSERT, UPDATE, DELETE, TRUNCATE, ALTER ou DROP.
-- Objetivo: fornecer IDs estaveis para cruzar clubes reais com os cadastros atuais
-- antes de qualquer proposta de migracao. Nao altere nem apague os resultados.

-- RESULTADO 1: uma linha por clube vinculado a uma das ligas.
-- Inclui contagem de jogadores e partidas; preserve league_id e club_id no arquivo exportado.
SELECT
  l.id AS league_id,
  l.nome AS liga,
  l.pais,
  l.divisao,
  l.temporada,
  c.id AS club_id,
  c.nome AS clube_atual,
  c.is_ai,
  c.owner_id,
  COUNT(DISTINCT p.id) AS total_jogadores,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_star = TRUE) AS jogadores_estrelas,
  COUNT(DISTINCT p.id) FILTER (WHERE p.is_youth = TRUE) AS jogadores_base,
  COUNT(DISTINCT m.id) AS total_partidas,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'played') AS partidas_disputadas,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status <> 'played') AS partidas_nao_disputadas
FROM public.leagues l
LEFT JOIN public.clubs c ON c.league_id = l.id
LEFT JOIN public.players p ON p.club_id = c.id
LEFT JOIN public.matches m
  ON m.league_id = l.id
 AND (m.home_club_id = c.id OR m.away_club_id = c.id)
GROUP BY
  l.id, l.nome, l.pais, l.divisao, l.temporada,
  c.id, c.nome, c.is_ai, c.owner_id
ORDER BY l.pais, l.divisao, c.nome;

-- RESULTADO 2: elenco nominal atual (uma linha por jogador).
-- Necessario para preservar jogadores, contratos e clubes que nao devem ser substituidos.
SELECT
  l.id AS league_id,
  l.nome AS liga,
  l.pais,
  l.divisao,
  c.id AS club_id,
  c.nome AS clube_atual,
  c.is_ai,
  p.id AS player_id,
  p.nome AS jogador,
  p.posicao,
  p.data_nascimento,
  p.nacionalidade,
  p.overall,
  p.potencial,
  p.is_star,
  p.is_youth,
  p.valor_mercado,
  p.salario_mensal,
  p.status_contrato,
  p.contrato_ate,
  p.disponivel_transferencia,
  p.disponivel_emprestimo
FROM public.players p
LEFT JOIN public.clubs c ON c.id = p.club_id
LEFT JOIN public.leagues l ON l.id = c.league_id
WHERE c.id IS NOT NULL
ORDER BY l.pais, l.divisao, c.nome, p.overall DESC, p.nome;

-- RESULTADO 3: clubes sem liga (nao incluir automaticamente em migracao).
SELECT
  c.id AS club_id,
  c.nome AS clube_atual,
  c.pais,
  c.is_ai,
  c.owner_id,
  COUNT(p.id) AS total_jogadores
FROM public.clubs c
LEFT JOIN public.players p ON p.club_id = c.id
WHERE c.league_id IS NULL
GROUP BY c.id, c.nome, c.pais, c.is_ai, c.owner_id
ORDER BY c.pais, c.nome;
