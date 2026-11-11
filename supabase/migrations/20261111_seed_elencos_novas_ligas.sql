-- Manager Futebol Online: elencos para clubes de IA ainda sem jogadores.
-- Cria 22 atletas por clube vazio. Preserva integralmente clubes que já possuem elenco.
-- Pode executar novamente: clubes com jogadores são ignorados.

with clubes_vazios as (
  select c.id, c.nome, c.cidade, c.pais, l.divisao
  from public.clubs c
  join public.leagues l on l.id = c.league_id
  where c.is_ai = true
    and l.temporada = 1
    and not exists (
      select 1 from public.players p where p.club_id = c.id
    )
),
nomes as (
  select
    array['Lucas','Gabriel','Matheus','Pedro','Rafael','João','Bruno','Thiago','Felipe','Gustavo','Daniel','André','Caio','Vitor','Enzo','Arthur','Leonardo','Samuel','Diego','Nicolas','Davi','Murilo']::text[] as primeiros,
    array['Silva','Santos','Oliveira','Souza','Pereira','Lima','Costa','Ferreira','Rodrigues','Almeida','Nascimento','Araújo','Ribeiro','Carvalho','Gomes','Martins','Rocha','Barbosa','Alves','Monteiro','Mendes','Teixeira']::text[] as sobrenomes
),
atletas as (
  select
    c.id as club_id,
    c.pais,
    c.cidade,
    c.divisao,
    gs.n as numero,
    (array['Goleiro','Zagueiro','Zagueiro','Zagueiro','Zagueiro','Lateral','Lateral','Volante','Volante','Volante','Meia','Meia','Meia','Meia','Ponta','Ponta','Ponta','Atacante','Atacante','Atacante','Atacante','Atacante'])[gs.n] as posicao,
    n.primeiros[gs.n] as primeiro,
    n.sobrenomes[gs.n] as sobrenome
  from clubes_vazios c
  cross join generate_series(1,22) gs(n)
  cross join nomes n
),
preparados as (
  select *,
    case
      when divisao = '1ª divisão' then 66 + ((numero * 7 + length(cidade)) % 17)
      when divisao = '2ª divisão' then 59 + ((numero * 7 + length(cidade)) % 17)
      else 54 + ((numero * 7 + length(cidade)) % 17)
    end as ovr
  from atletas
)
insert into public.players
  (club_id, nome, posicao, data_nascimento, overall, potencial,
   valor_mercado, is_star, status_contrato, nacionalidade,
   disponivel_transferencia, disponivel_emprestimo)
select
  p.club_id,
  p.primeiro || ' ' || p.sobrenome || ' de ' || p.cidade || ' ' || lpad(p.numero::text,2,'0'),
  p.posicao,
  (current_date - ((18 + (p.numero % 18)) * interval '1 year') - ((p.numero * 19 % 365) * interval '1 day'))::date,
  p.ovr,
  least(99, p.ovr + 4 + (p.numero % 12)),
  (case when p.ovr >= 88 then 25000000
        when p.ovr >= 80 then 8000000
        when p.ovr >= 70 then 2500000
        else 250000 + (p.ovr * 12000) end)::numeric(15,2),
  p.ovr >= 89,
  'ativo',
  p.pais,
  false,
  false
from preparados p
where not exists (
  select 1 from public.players old where old.club_id = p.club_id
);

-- Conferência dos elencos: quantidade de clubes e jogadores por liga.
select
  l.pais,
  l.nome as campeonato,
  l.divisao,
  count(distinct c.id) as total_clubes,
  count(p.id) as total_jogadores,
  count(p.id)::numeric / nullif(count(distinct c.id),0) as media_jogadores_por_clube
from public.leagues l
left join public.clubs c on c.league_id = l.id and c.is_ai = true
left join public.players p on p.club_id = c.id
where l.temporada = 1
group by l.id, l.pais, l.nome, l.divisao
order by l.pais, l.divisao;
