-- Manager Futebol Online: expansão de ligas nacionais
-- Seguro para executar novamente: não apaga nem altera ligas existentes.
-- Clubes e jogadores serão cadastrados em etapa separada.

insert into public.leagues (nome, pais, divisao, temporada)
values
  ('Brasileirão Série C', 'Brasil', '3ª divisão', 1),

  ('J1 League', 'Japão', '1ª divisão', 1),
  ('J2 League', 'Japão', '2ª divisão', 1),
  ('K League 1', 'Coreia do Sul', '1ª divisão', 1),
  ('K League 2', 'Coreia do Sul', '2ª divisão', 1),
  ('Saudi Pro League', 'Arábia Saudita', '1ª divisão', 1),
  ('Saudi First Division', 'Arábia Saudita', '2ª divisão', 1),
  ('UAE Pro League', 'Emirados Árabes Unidos', '1ª divisão', 1),
  ('UAE First Division', 'Emirados Árabes Unidos', '2ª divisão', 1),

  ('Egyptian Premier League', 'Egito', '1ª divisão', 1),
  ('Egyptian Second Division', 'Egito', '2ª divisão', 1),
  ('Botola Pro', 'Marrocos', '1ª divisão', 1),
  ('Botola 2', 'Marrocos', '2ª divisão', 1),
  ('South African Premiership', 'África do Sul', '1ª divisão', 1),
  ('Motsepe Foundation Championship', 'África do Sul', '2ª divisão', 1),
  ('Tunisian Ligue 1', 'Tunísia', '1ª divisão', 1),
  ('Tunisian Ligue 2', 'Tunísia', '2ª divisão', 1),

  ('A-League Men', 'Austrália', '1ª divisão', 1),
  ('New Zealand National League', 'Nova Zelândia', '1ª divisão', 1)
on conflict (nome, pais, divisao, temporada) do nothing;

select pais, count(*) as ligas
from public.leagues
where temporada = 1
group by pais
order by pais;
