-- Garante que a estrutura dos clubes de IA exista antes da carga de jogadores.
alter table public.clubs add column if not exists is_ai boolean not null default false;
alter table public.clubs add column if not exists league_id uuid references public.leagues(id);

-- Manager Futebol Online: catálogo inicial de jogadores
-- Gera 22 atletas para cada clube de IA (200 clubes = 4.400 jogadores)
-- e mais 200 agentes livres. Nomes fictícios; atributos e valores são dados de jogo.
-- Seguro para executar novamente: evita duplicar por nome + clube.

with nomes as (
  select
    array['Lucas','Gabriel','Matheus','Pedro','Rafael','João','Bruno','Thiago','Felipe','Gustavo','Daniel','André','Caio','Vitor','Enzo','Arthur','Leonardo','Samuel','Diego','Nicolas','Davi','Murilo','Igor','Eduardo','Heitor','Renan','Alex','Marcos','Vinícius','Luan']::text[] as primeiros,
    array['Almeida','Ferreira','Costa','Oliveira','Santos','Pereira','Carvalho','Rodrigues','Martins','Lima','Gomes','Ribeiro','Barbosa','Mendes','Moreira','Nunes','Castro','Correia','Silva','Azevedo','Teixeira','Cardoso','Campos','Monteiro','Vieira','Dias','Rocha','Freitas','Moura','Andrade']::text[] as sobrenomes
),
elencos as (
  select
    c.id as club_id,
    c.pais,
    c.nome as clube_nome,
    l.divisao,
    gs.n as numero,
    (array['Goleiro','Zagueiro','Zagueiro','Zagueiro','Zagueiro','Lateral','Lateral','Volante','Volante','Volante','Meia','Meia','Meia','Meia','Ponta','Ponta','Ponta','Atacante','Atacante','Atacante','Atacante','Atacante'])[gs.n] as posicao,
    n.primeiros[((row_number() over (order by c.id, gs.n) - 1) % array_length(n.primeiros,1)) + 1] as primeiro,
    n.sobrenomes[((row_number() over (order by c.id, gs.n) * 7 - 1) % array_length(n.sobrenomes,1)) + 1] as sobrenome,
    row_number() over (order by c.id, gs.n) as seq
  from public.clubs c
  join public.leagues l on l.id = c.league_id
  cross join generate_series(1,22) gs(n)
  cross join nomes n
  where c.is_ai = true
),
preparados as (
  select *,
    case
      when numero = 1 then 'Goleiro'
      else posicao
    end as pos_final,
    case
      when numero = 22 and (seq % 5 = 0) then 89 + (seq % 6)
      else greatest(48, least(88,
        (case when divisao = '1ª divisão' then 64 else 55 end)
        + ((seq * 13 + numero * 7) % 25) - 8))
    end as ovr
  from elencos
)
insert into public.players
  (club_id, nome, posicao, data_nascimento, overall, potencial,
   valor_mercado, is_star, status_contrato, nacionalidade,
   disponivel_transferencia, disponivel_emprestimo)
select
  p.club_id,
  p.primeiro || ' ' || p.sobrenome || ' ' || lpad((p.seq % 97)::text,2,'0'),
  p.pos_final,
  (current_date - ((18 + (p.seq % 18)) * interval '1 year') - ((p.seq * 19 % 365) * interval '1 day'))::date,
  p.ovr,
  least(99, greatest(p.ovr, p.ovr + 4 + (p.seq % 12))),
  (case when p.ovr >= 88 then 25000000
        when p.ovr >= 80 then 8000000
        when p.ovr >= 70 then 2500000
        else 250000 + (p.ovr * 12000) end)::numeric(15,2),
  p.ovr >= 89,
  'ativo',
  p.pais,
  (p.seq % 5 = 0),
  (p.seq % 4 = 0)
from preparados p
where not exists (
  select 1 from public.players old
  where old.club_id = p.club_id
    and old.nome = p.primeiro || ' ' || p.sobrenome || ' ' || lpad((p.seq % 97)::text,2,'0')
);

-- 200 jogadores livres, de várias nacionalidades e posições.
with nomes as (
  select
    array['Alex','Ben','Carlos','David','Elias','Franco','Hugo','Ivan','Julian','Kevin','Luis','Marco','Noah','Oscar','Pablo','Raul','Sergio','Tomas','Victor','Yuri']::text[] as primeiros,
    array['Bianchi','Muller','Silva','Garcia','Rossi','Moreau','Jansen','Costa','Novak','Santos','Fernandez','Kovac','Weber','Romero','Pereira','Dubois','Andersson','Conti','Herrera','Sousa']::text[] as sobrenomes,
    array['Brasil','Argentina','Inglaterra','Espanha','Alemanha','Itália','França','Portugal','Holanda','México']::text[] as paises
),
livres as (
  select gs.n,
    n.primeiros[((gs.n - 1) % 20) + 1] as primeiro,
    n.sobrenomes[((gs.n * 7 - 1) % 20) + 1] as sobrenome,
    n.paises[((gs.n - 1) % 10) + 1] as pais,
    (array['Goleiro','Zagueiro','Lateral','Volante','Meia','Ponta','Atacante'])[((gs.n - 1) % 7) + 1] as posicao,
    55 + (gs.n * 11 % 31) as ovr
  from generate_series(1,200) gs(n)
  cross join nomes n
)
insert into public.players
  (club_id, nome, posicao, data_nascimento, overall, potencial,
   valor_mercado, is_star, status_contrato, nacionalidade,
   disponivel_transferencia, disponivel_emprestimo)
select
  null,
  l.primeiro || ' ' || l.sobrenome || ' Livre ' || lpad(l.n::text,3,'0'),
  l.posicao,
  (current_date - ((19 + (l.n % 16)) * interval '1 year'))::date,
  l.ovr,
  least(96, l.ovr + 8 + (l.n % 10)),
  (case when l.ovr >= 80 then 3500000 else 150000 + l.ovr * 9000 end)::numeric(15,2),
  l.ovr >= 84,
  'livre',
  l.pais,
  false,
  false
from livres l
where not exists (
  select 1 from public.players old
  where old.club_id is null
    and old.nome = l.primeiro || ' ' || l.sobrenome || ' Livre ' || lpad(l.n::text,3,'0')
);

-- Resumo da carga
select
  count(*) filter (where club_id is not null) as jogadores_em_clubes,
  count(*) filter (where status_contrato = 'livre') as agentes_livres,
  count(*) filter (where is_star) as jogadores_estrelas
from public.players;
