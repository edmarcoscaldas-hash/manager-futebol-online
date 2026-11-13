# Validação de formatos e calendários das competições

**Data da revisão:** 13/11/2026  
**Status:** validação parcial com fontes públicas; não executar no banco.  
**Regra de segurança:** não alterar clubes, jogadores ou partidas existentes nesta etapa.

## 1. Correções já identificadas

| Competição | Participantes/estrutura confirmada | Formato e impacto no calendário | Situação |
|---|---|---|---|
| Japão — J1 2026/27 | 20 clubes | Turno e returno, 38 rodadas, 380 jogos | Confirmado em página oficial J.League |
| Japão — J2 2026/27 | 20 clubes | Turno e returno, 38 rodadas, 380 jogos | Confirmado em página oficial J.League |
| Coreia — K League 1 2026 | 12 clubes | 3 turnos na fase regular (33 rodadas, 198 jogos) + divisão em grupos A/B com uma rodada (30 jogos); total 228 | Confirmado no regulamento oficial K League |
| Coreia — K League 2 2026 | 17 clubes | 2 turnos, 34 rodadas, 272 jogos na fase regular; playoffs de promoção acrescentam partidas | Confirmado no regulamento oficial K League |
| Egito — Premier League 2026/27 | 20 clubes | Primeira fase em turno único (19 jogos por clube); depois grupo dos 6 primeiros e grupo dos 14 restantes, ambos em turno único | Formato confirmado por cobertura contemporânea; regulamento oficial ainda deve ser obtido |
| Nova Zelândia — National League masculina 2026 | 11 clubes | Edição de 2026; formato muda em 2027. Não usar 12 clubes nem aplicar turno e returno automaticamente | Participantes confirmados por New Zealand Football |
| Tunísia — Ligue 1 2026/27 | Coleta secundária indica 16 clubes | Formato ainda não validado em fonte oficial | Pendente |
| Tunísia — Ligue 2 2026/27 | Coleta secundária indica 28 clubes | Formato ainda não validado em fonte oficial | Pendente |

## 2. Fontes consultadas

- J.League — J1 2026/27: https://ddb.j-league.or.jp/other/j1detail/
- J.League — J2 2026/27: https://ddb.j-league.or.jp/other/j2detail/
- K League — regulamentos e formato 2026: https://www.kleague.com/about/competition.do
- K League — mudanças da temporada 2026: https://www.kleague.com/news_view.do?category=notice&orderBy=seq&page=2&seq=94022
- Ahram Online — formato da Premier League egípcia 2026/27: https://english.ahram.org.eg/newscontentp/6/574993/sports/egyptian-premier-league-set-for-new-season-with-fr.aspx
- New Zealand Football — participantes da National League 2026: https://www.nzfootball.co.nz/newsarticle/170010
- Footlink — informação preliminar sobre ligas tunisianas (fonte secundária, requer confirmação): https://www.footlink.tn/competitions

## 3. Contagem de partidas — o que pode ser calculado

Para uma liga de grupo único em turno e returno, o total é N × (N − 1). Isso só pode ser aplicado quando o regulamento confirmar esse formato.

- J1 2026/27: 20 × 19 = 380.
- J2 2026/27: 20 × 19 = 380.
- K League 1 2026: 228 no total, conforme regulamento (não 12 × 11 = 132).
- K League 2 2026: 272 na fase regular, mais playoffs.
- Egito Premier League 2026/27: 190 jogos na fase inicial; os grupos seguintes acrescentam partidas, conforme regulamento final.
- Nova Zelândia 2026: não calcular por fórmula de liga dupla; a competição tem formato próprio e 11 participantes.

## 4. Alertas de divergência para resolver antes da migração

1. O banco atual possui 10 clubes em cada liga estrangeira. Isso é um cadastro artificial inicial, não representa o número oficial de participantes.
2. A prévia documental anterior registrou 12 clubes para a National League da Nova Zelândia; a fonte da federação informa 11 participantes masculinos em 2026.
3. O pacote de coleta registrou K League 1 com 12 e K League 2 com 17, mas o calendário atual do MFO tem 10 em cada. O sistema precisa suportar os formatos distintos.
4. A J.League está em transição para temporada 2026/27 e 20 clubes em cada divisão J1/J2; os dados antigos de temporada civil devem ser substituídos apenas após validação dos participantes e aliases.
5. A Egyptian Premier League 2026/27 mantém 20 clubes, mas adota fase inicial e dois grupos finais. Não gerar 380 partidas para essa liga.
6. A segunda divisão egípcia não deve ser presumida como 20 clubes. A Federação Egípcia publicou para 2025/26 uma estrutura com 18 clubes na Segunda Divisão A e 89 na Segunda Divisão B, em grupos geográficos. A edição 2026/27 precisa de regulamento próprio antes de definir o recorte que o MFO representará.
7. A Tunisian Ligue 2 está ausente do relatório de elencos original. A contagem de 28 clubes é apenas uma pista secundária, não um dado aprovado.
8. A Primera Nacional argentina tem 36 clubes em duas zonas de 18, com rodadas interzonais e mata-mata; não é uma liga simples de 36 clubes em turno e returno.

## 5. Próximas validações

- Obter regulamentos oficiais e listas finais de participantes das 39 ligas.
- Resolver especialmente formatos por grupos, playoffs, divisões geográficas e fases finais.
- Definir quais níveis inferiores serão representados integralmente no MFO quando o campeonato real tiver dezenas de clubes ou grupos regionais.
- Cruzar a lista final com os IDs atuais do Supabase, mantendo IDs dos clubes que correspondam aos participantes reais.
- Só então gerar a proposta transacional de migração e calendário. Nenhum SQL de escrita deve ser executado antes da aprovação.

## 6. Estado do banco

A referência de auditoria permanece: 39 ligas, 420 clubes IA, 8.580 jogadores IA e 4.380 partidas pendentes. Nenhuma alteração foi feita por este documento.


## 7. Nova rodada de validação — Europa e outras ligas (13/11/2026)

Esta rodada acrescenta evidências para algumas competições, mas não fecha a validação de todas as 39 ligas. Quando a fonte é uma página oficial da competição ou federação, ela é priorizada; quando a evidência disponível é secundária, isso fica explícito.

### Inglaterra
- **Premier League 2026/27: 20 clubes.** A própria Premier League lista os 20 participantes da temporada. Formato de liga com 38 jogos por clube (turno e returno), 380 partidas totais. Fonte oficial: https://www.premierleague.com/en/news/4365156/new-to-the-premier-league-heres-all-you-need-to-know
- **Championship: 24 clubes.** A página oficial da EFL mostra 24 equipes na tabela. Em liga de turno e returno, são 46 jogos por clube e 552 partidas totais. Fonte oficial: https://www.efl.com/competitions/efl-championship/
- **Playoffs Championship 2026/27:** a imprensa esportiva reporta ampliação de quatro para seis equipes com eliminatórias; confirmar no regulamento oficial EFL antes de programar a fase final. Fonte secundária: https://www.skysports.com/football/news/13571710/championship-play-offs-change-explained-how-revamped-2026-27-format-from-top-six-to-top-eight-will-work

### Espanha
- **LaLiga 2026/27: 20 clubes.** A tabela oficial da competição confirma 20 participantes. Em turno e returno, 38 rodadas e 380 jogos. Fonte oficial: https://www.laliga.com/en-GB/laliga-easports/standing
- **Segunda División 2026/27: 22 clubes.** A lista de participantes localizada nesta rodada veio de fonte jornalística, não de regulamento oficial consultado. Usar 22 como provisório e confirmar na página oficial LALIGA antes de migrar. Fonte secundária: https://www.eldesmarque.com/futbol/liga-1a-division/20260620/confirmados-laliga-easports-hypermotion_18_019504221.html

### Alemanha
- **Bundesliga 2026/27: 18 clubes.** A página oficial da Bundesliga apresenta os clubes da temporada. Formato padrão de turno e returno: 34 jogos por clube, 306 partidas. Fonte oficial: https://www.bundesliga.com/pt/bundesliga/clubes
- **2. Bundesliga 2026/27: 18 clubes.** A página oficial da competição apresenta os clubes da temporada. Formato padrão de turno e returno: 34 jogos por clube, 306 partidas. Fonte oficial: https://www.bundesliga.com/de/2bundesliga/clubs

### França
- **Ligue 1 2026/27: 18 clubes.** A comunicação oficial da liga refere-se às 18 equipes participantes. Em turno e returno: 34 jogos por clube, 306 partidas. Fonte oficial: https://ligue1.com/en/articles/l1_article_5328-when-does-the-season-start-for-ligue-1-mc-donald-s-clubs
- **Ligue 2 2026/27: 18 clubes.** A própria liga identifica 18 participantes. Em turno e returno: 34 jogos por clube, 306 partidas. Fonte oficial: https://ligue1.com/fr/articles/l1_article_5558-historique-les-18-clubs-de-ligue-2-bkt-en-chiffres

### Itália
- **Serie A 2026/27: 20 clubes.** A Lega Serie A confirma 20 equipes, 38 rodadas e 380 partidas totais. Fonte oficial: https://www.legaseriea.it/serie-a/news/aspettando-il-calendario-della-serie-a-enilive-2026-27
- **Serie B:** a contagem de 20 clubes é consistente com as referências disponíveis, mas ainda falta nesta rodada uma página oficial específica da Lega B com a lista e regulamento 2026/27. Manter como pendente de confirmação formal antes da migração.

### Portugal
- **Liga Portugal Betclic: 18 clubes, 34 jornadas.**
- **Liga Portugal 2 Meu Super: 18 clubes, 34 jornadas, incluindo três equipes B.** As equipes B não podem subir, mas podem ser rebaixadas. A fonte oficial da Liga Portugal descreve os dois formatos e regras de promoção/rebaixamento: https://www.ligaportugal.pt/pages/sobre-a-liga
- A Liga Portugal publicou o calendário profissional 2026/27, com início previsto para 9 de agosto de 2026 e última rodada em 16 de maio de 2027: https://www.ligaportugal.pt/news/27682/definido-o-arranque-das-competicoes-profissionais-2026-27

### África do Sul
- A Premier Soccer League confirmou o calendário 2026/27 da Betway Premiership e da Motsepe Foundation Championship. A página consultada confirma a temporada e datas, mas o conteúdo recuperado nesta rodada não prova a quantidade final de participantes de cada divisão. Portanto, **não alterar a contagem** sem consultar a lista oficial de clubes/fixtures. Fonte oficial: https://www.psl.co.za/news/article/5615294-psl-confirms-the-202627-season-calend

### México
- Uma fonte secundária consultada descreve Liga MX com 18 clubes e Liga de Expansión MX com 16, além dos torneios Apertura/Clausura e liguilla. Ainda falta validação na página/regulamento oficial da Liga MX para 2026/27. Não usar como confirmação final. Fonte secundária: https://worldofswos.com/en/countries/mex/

### Portugal — nível nacional abaixo das divisões profissionais
- O Campeonato de Portugal 2026/27 terá 56 clubes em quatro séries geográficas de 14, com quatro fases e playoffs. É competição abaixo da Liga 3, não deve ser confundida com a Liga Portugal 2. Fonte da associação distrital que reproduz a estrutura divulgada pela FPF: https://afatv.pt/news-details/32cc0a33-f2e0-4924-a469-0e5e43f20377
- A arquitetura MFO precisa decidir se representará integralmente níveis regionais com grande número de clubes ou se limitará o escopo às divisões nacionais selecionadas.

### Resumo desta rodada
| Competição | Participantes | Situação |
|---|---:|---|
| Premier League | 20 | Confirmado em fonte oficial |
| Championship | 24 | Confirmado em fonte oficial |
| LaLiga | 20 | Confirmado em fonte oficial |
| Segunda División | 22 | Provisório; fonte secundária nesta rodada |
| Bundesliga | 18 | Confirmado em fonte oficial |
| 2. Bundesliga | 18 | Confirmado em fonte oficial |
| Ligue 1 | 18 | Confirmado em fonte oficial |
| Ligue 2 | 18 | Confirmado em fonte oficial |
| Serie A | 20 | Confirmado em fonte oficial |
| Serie B | 20 | Pendente de fonte oficial específica nesta rodada |
| Liga Portugal Betclic | 18 | Confirmado em fonte oficial |
| Liga Portugal 2 | 18 | Confirmado em fonte oficial |
| Betway Premiership | — | Temporada confirmada; total de clubes pendente |
| Motsepe Foundation Championship | — | Temporada confirmada; total de clubes pendente |
| Liga MX | 18 | Provisório; confirmar fonte oficial |
| Liga de Expansión MX | 16 | Provisório; confirmar fonte oficial |

**Importante:** os totais acima são contagens de participantes, não uma autorização para gerar calendários. A programação deve respeitar playoffs, grupos, fases finais, datas de copa e regras próprias. O calendário atual do MFO permanece intacto até a migração ser aprovada.
