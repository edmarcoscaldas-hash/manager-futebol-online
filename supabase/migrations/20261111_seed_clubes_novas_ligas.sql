-- Manager Futebol Online: preenchimento inicial das divisões novas.
-- Cria 10 clubes fictícios por liga que ainda não possui clubes.
-- Não move, renomeia nem apaga clubes existentes. Pode executar novamente.
-- Os elencos serão gerados pela migration 20261110_seed_players.sql.

with cidades as (
  select * from (values
    ('África do Sul','Johannesburgo'),('África do Sul','Cidade do Cabo'),('África do Sul','Durban'),('África do Sul','Pretória'),('África do Sul','Port Elizabeth'),('África do Sul','Bloemfontein'),('África do Sul','Polokwane'),('África do Sul','Nelspruit'),('África do Sul','Kimberley'),('África do Sul','East London'),
    ('Arábia Saudita','Riad'),('Arábia Saudita','Jeddah'),('Arábia Saudita','Meca'),('Arábia Saudita','Medina'),('Arábia Saudita','Dammam'),('Arábia Saudita','Taif'),('Arábia Saudita','Tabuk'),('Arábia Saudita','Abha'),('Arábia Saudita','Buraidah'),('Arábia Saudita','Jubail'),
    ('Austrália','Sydney'),('Austrália','Melbourne'),('Austrália','Brisbane'),('Austrália','Perth'),('Austrália','Adelaide'),('Austrália','Canberra'),('Austrália','Newcastle'),('Austrália','Wollongong'),('Austrália','Gold Coast'),('Austrália','Geelong'),
    ('Brasil','São Paulo'),('Brasil','Rio de Janeiro'),('Brasil','Belo Horizonte'),('Brasil','Curitiba'),('Brasil','Porto Alegre'),('Brasil','Salvador'),('Brasil','Recife'),('Brasil','Fortaleza'),('Brasil','Goiânia'),('Brasil','Florianópolis'),
    ('Coreia do Sul','Seul'),('Coreia do Sul','Busan'),('Coreia do Sul','Incheon'),('Coreia do Sul','Daegu'),('Coreia do Sul','Daejeon'),('Coreia do Sul','Ulsan'),('Coreia do Sul','Suwon'),('Coreia do Sul','Jeonju'),('Coreia do Sul','Pohang'),('Coreia do Sul','Gwangju'),
    ('Egito','Cairo'),('Egito','Alexandria'),('Egito','Gizé'),('Egito','Port Said'),('Egito','Suez'),('Egito','Ismailia'),('Egito','Mansoura'),('Egito','Tanta'),('Egito','Aswan'),('Egito','Luxor'),
    ('Emirados Árabes Unidos','Abu Dhabi'),('Emirados Árabes Unidos','Dubai'),('Emirados Árabes Unidos','Sharjah'),('Emirados Árabes Unidos','Al Ain'),('Emirados Árabes Unidos','Ajman'),('Emirados Árabes Unidos','Fujairah'),('Emirados Árabes Unidos','Ras Al Khaimah'),('Emirados Árabes Unidos','Kalba'),('Emirados Árabes Unidos','Dibba'),('Emirados Árabes Unidos','Khor Fakkan'),
    ('Japão','Tóquio'),('Japão','Yokohama'),('Japão','Osaka'),('Japão','Nagoya'),('Japão','Kobe'),('Japão','Sapporo'),('Japão','Hiroshima'),('Japão','Fukuoka'),('Japão','Kyoto'),('Japão','Sendai'),
    ('Marrocos','Casablanca'),('Marrocos','Rabat'),('Marrocos','Marrakech'),('Marrocos','Fez'),('Marrocos','Tânger'),('Marrocos','Agadir'),('Marrocos','Meknès'),('Marrocos','Oujda'),('Marrocos','Kenitra'),('Marrocos','Safi'),
    ('Nova Zelândia','Auckland'),('Nova Zelândia','Wellington'),('Nova Zelândia','Christchurch'),('Nova Zelândia','Hamilton'),('Nova Zelândia','Dunedin'),('Nova Zelândia','Tauranga'),('Nova Zelândia','Napier'),('Nova Zelândia','Nelson'),('Nova Zelândia','Rotorua'),('Nova Zelândia','Palmerston North'),
    ('Tunísia','Túnis'),('Tunísia','Sfax'),('Tunísia','Sousse'),('Tunísia','Kairouan'),('Tunísia','Bizerte'),('Tunísia','Gabès'),('Tunísia','Ariana'),('Tunísia','Gafsa'),('Tunísia','Monastir'),('Tunísia','Nabeul')
  ) as t(pais,cidade)
),
ligas_vazias as (
  select l.id, l.pais, l.nome, l.divisao
  from public.leagues l
  where l.temporada = 1
    and l.pais in ('África do Sul','Arábia Saudita','Austrália','Brasil','Coreia do Sul','Egito','Emirados Árabes Unidos','Japão','Marrocos','Nova Zelândia','Tunísia')
    and not exists (select 1 from public.clubs c where c.league_id = l.id)
),
clubes AS (
  select
    l.id as league_id,
    l.pais,
    l.nome as liga,
    l.divisao,
    c.cidade,
    row_number() over (partition by l.id order by c.cidade) as n
  from ligas_vazias l
  join cidades c on c.pais = l.pais
)
insert into public.clubs
  (owner_id, nome, sigla, cidade, pais, estadio, capacidade, orcamento, is_ai, league_id)
select
  null,
  x.cidade || ' ' ||
    (array['United FC','Sporting','Athletic','City FC','Real FC','Dynamo','Rovers','Olympic','Stars','Academy'])[((x.n-1)%10)+1] ||
    case when x.divisao = '2ª divisão' then ' B' when x.divisao = '3ª divisão' then ' C' else '' end,
  upper(substr(md5(x.league_id::text || x.n::text),1,3)),
  x.cidade,
  x.pais,
  'Estádio ' || x.cidade,
  case when x.divisao = '1ª divisão' then 22000 when x.divisao = '2ª divisão' then 14000 else 9000 end,
  case when x.divisao = '1ª divisão' then 12000000 when x.divisao = '2ª divisão' then 6500000 else 3500000 end,
  true,
  x.league_id
from clubes x
where not exists (
  select 1 from public.clubs c
  where c.league_id = x.league_id
    and c.nome = x.cidade || ' ' ||
      (array['United FC','Sporting','Athletic','City FC','Real FC','Dynamo','Rovers','Olympic','Stars','Academy'])[((x.n-1)%10)+1] ||
      case when x.divisao = '2ª divisão' then ' B' when x.divisao = '3ª divisão' then ' C' else '' end
);

-- Conferência da quantidade de clubes por liga após a carga.
select l.pais, l.nome as campeonato, l.divisao, count(c.id) as total_clubes
from public.leagues l
left join public.clubs c on c.league_id = l.id
where l.temporada = 1
group by l.id, l.pais, l.nome, l.divisao
order by l.pais, l.divisao;
