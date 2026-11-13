-- CONSULTA SOMENTE DE LEITURA
-- Retorna as ligas atuais, IDs e clubes vinculados para cruzar os elencos.
-- Não insere, atualiza nem remove dados; não altera calendários.

SELECT
  l.id AS league_id,
  l.nome AS liga,
  l.pais,
  l.divisao,
  l.temporada,
  c.id AS club_id,
  c.nome AS clube,
  c.is_ai,
  c.owner_id
FROM public.leagues AS l
LEFT JOIN public.clubs AS c
  ON c.league_id = l.id
ORDER BY
  l.pais,
  l.divisao,
  l.nome,
  c.nome;

-- Clubes sem liga vinculada (para identificar cadastros fora das 39 competições).
SELECT
  c.id AS club_id,
  c.nome AS clube,
  c.pais,
  c.is_ai,
  c.owner_id
FROM public.clubs AS c
WHERE c.league_id IS NULL
ORDER BY c.pais, c.nome;

-- Resumo por liga: quantidade de clubes IA e clubes de usuários.
SELECT
  l.id AS league_id,
  l.nome AS liga,
  l.pais,
  l.divisao,
  l.temporada,
  COUNT(c.id) FILTER (WHERE c.is_ai = TRUE) AS clubes_ia,
  COUNT(c.id) FILTER (WHERE c.is_ai = FALSE) AS clubes_usuarios,
  COUNT(c.id) AS total_clubes
FROM public.leagues AS l
LEFT JOIN public.clubs AS c
  ON c.league_id = l.id
GROUP BY l.id, l.nome, l.pais, l.divisao, l.temporada
ORDER BY l.pais, l.divisao, l.nome;
