-- Cadastro inicial de ligas do Manager Futebol Online.
-- Seguro para executar novamente: evita duplicar ligas da temporada 1.
insert into public.leagues (nome, pais, divisao, temporada)
values
  ('Liga Nacional', 'Brasil', '1ª divisão', 1),
  ('Liga Nacional', 'Brasil', '2ª divisão', 1),
  ('Liga Argentina', 'Argentina', '1ª divisão', 1),
  ('Liga Argentina', 'Argentina', '2ª divisão', 1),
  ('Premier League', 'Inglaterra', '1ª divisão', 1),
  ('Championship', 'Inglaterra', '2ª divisão', 1),
  ('La Liga', 'Espanha', '1ª divisão', 1),
  ('Segunda División', 'Espanha', '2ª divisão', 1),
  ('Bundesliga', 'Alemanha', '1ª divisão', 1),
  ('2. Bundesliga', 'Alemanha', '2ª divisão', 1),
  ('Serie A', 'Itália', '1ª divisão', 1),
  ('Serie B', 'Itália', '2ª divisão', 1),
  ('Ligue 1', 'França', '1ª divisão', 1),
  ('Ligue 2', 'França', '2ª divisão', 1),
  ('Liga Portugal', 'Portugal', '1ª divisão', 1),
  ('Liga Portugal 2', 'Portugal', '2ª divisão', 1),
  ('Eredivisie', 'Holanda', '1ª divisão', 1),
  ('Eerste Divisie', 'Holanda', '2ª divisão', 1),
  ('Liga MX', 'México', '1ª divisão', 1),
  ('Liga de Expansión MX', 'México', '2ª divisão', 1)
on conflict (nome, pais, divisao, temporada) do nothing;
