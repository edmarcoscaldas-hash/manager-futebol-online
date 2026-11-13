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


## 8. Nova rodada de validação — África, Ásia, Argentina e Oriente Médio (13/11/2026)

### Arábia Saudita
- **Roshn Saudi League 2026/27: 18 clubes, 34 rodadas e 306 partidas.** A Saudi Pro League publicou o calendário oficial e informa explicitamente os 306 jogos e 34 rodadas. Fonte oficial: https://www.spl.com.sa/en/news/spl-announces-2026-27-rsl-fixture-schedule
- **Saudi First Division 2026/27: 18 clubes.** A página oficial da federação lista 18 clubes na Premier Division e 18 na First Division para 2026/27. Fonte oficial: https://www.saff.com.sa/en/teams.php?id=1
- A lista de clubes da federação também mostra níveis inferiores, mas não significa que todos devam ser incorporados ao escopo MFO. A divisão escolhida precisa ser definida e seus regulamentos consultados. Página oficial: https://www.saff.com.sa/en/about.php?id=2&type=2

### Argentina
- **Liga Profesional 2026: 30 clubes em duas zonas de 15.** A AFA publicou os grupos A e B do Apertura e Clausura. O formato não deve ser modelado como liga única de 30 em turno e returno; é preciso representar as fases Apertura/Clausura, datas interzonais e mata-mata conforme regulamento. Fonte oficial AFA: https://www.afa.com.ar/es/posts/sorteo-de-la-liga-profesional-2026-se-definen-los-grupos-del-torneo-apertura-y-torneo-clausura
- **Primera Nacional 2026: 36 clubes em duas zonas de 18.** A estrutura está descrita em fonte secundária especializada; falta anexar o regulamento oficial AFA antes de programar o calendário. Fonte secundária: https://ligasargentinas.com.ar/2026
- Consequência para o MFO: a primeira divisão argentina deve deixar de ser tratada como grupo único; a segunda divisão exige duas zonas, além de regras de promoção/rebaixamento e playoffs.

### Marrocos
- **Botola Pro 1 Inwi: 16 clubes.**
- **Botola Pro 2 Inwi: 16 clubes.**
- A LNFP, entidade do futebol profissional marroquino vinculada à FRMF, apresenta explicitamente 16 clubes em cada uma das duas divisões profissionais. Fonte oficial: https://lnfp.ma/
- Para um grupo único em turno e returno, a conta teórica é 30 jogos por clube e 240 partidas por divisão. Confirmar eventuais alterações de regulamento antes de gerar a tabela final.

### Egito
- **Egyptian Premier League 2026/27: 20 clubes.** A primeira fase é disputada em turno único: 190 jogos. Depois, os seis primeiros formam o grupo do título (15 jogos) e os outros 14 disputam o grupo de permanência (91 jogos). Total aritmético: 296 jogos, sujeito à validação do regulamento e de eventuais partidas adicionais. A fonte consultada informa a estrutura e os participantes promovidos/rebaixados. Fonte jornalística especializada: https://english.ahram.org.eg/UI/Front/Inner.aspx?NewsContentID=573720
- A mesma fonte informa que a liga pretende retornar a 18 clubes em turno e returno em 2027/28. Portanto, não transportar o formato 2026/27 automaticamente para a temporada seguinte.
- **Segunda divisão egípcia:** ainda sem quantidade única aprovada para o MFO. A estrutura publicada pela EFA para 2025/26 tem Segunda Divisão A e B, com grupos; é necessário confirmar a organização 2026/27 antes de importar.

### Emirados Árabes Unidos
- **ADNOC Pro League: 14 clubes** na lista oficial de clubes da UAE Pro League. Fonte oficial: https://www.uaeproleague.ae/en/clubs
- A página de clubes não basta para comprovar, isoladamente, o calendário completo 2026/27 nem a quantidade de participantes da First Division. Esses itens permanecem pendentes.
- Não usar 10 clubes no banco como representação final da primeira divisão.

### Tunísia
- **Ligue 1: 16 clubes**, conforme a lista pública de participantes 2026/27 consultada em fonte não oficial. A fonte indica 30 jogos por clube em turno e returno.
- **Ligue 2:** a mesma base apresenta uma competição dividida em grupos regionais e uma pirâmide com 28 clubes, mas a informação precisa ser confirmada pela Federação Tunisiana antes de definir a modelagem. Fontes não oficiais: https://www.national-football-teams.com/old/leagues/190/2026_1/Untitled.html e https://www.footlink.tn/competitions
- Status: manter os números como pistas para pesquisa, não como autorização de importação.

### África do Sul
- A PSL confirmou as datas da temporada 2026/27 da Betway Premiership e da Motsepe Foundation Championship, além de copas e playoffs de promoção. A página consultada não fornece, no trecho disponível, uma declaração explícita e consolidada do número de participantes da Championship. Fonte oficial: https://www.psl.co.za/news/article/5615294-psl-confirms-the-202627-season-calend
- A lista de fixtures e o regulamento da temporada devem ser usados para fechar o total de clubes e o formato de cada divisão. Não alterar os números atuais com base apenas no anúncio do calendário.

### Quadro de atualização desta rodada

| Competição | Participantes | Formato / observação | Confiança |
|---|---:|---|---|
| Saudi Pro League 2026/27 | 18 | 34 rodadas, 306 jogos | Oficial |
| Saudi First Division 2026/27 | 18 | Regulamento e calendário a conferir | Oficial para contagem |
| Argentina Liga Profesional 2026 | 30 | Duas zonas de 15; Apertura/Clausura | Oficial AFA |
| Argentina Primera Nacional 2026 | 36 | Duas zonas de 18 | Secundária; regulamento AFA pendente |
| Botola Pro 1 | 16 | Turno e returno a confirmar no regulamento | Oficial LNFP |
| Botola Pro 2 | 16 | Formato detalhado pendente | Oficial LNFP |
| Egyptian Premier League 2026/27 | 20 | Primeira fase + grupos finais | Fonte especializada |
| UAE ADNOC Pro League | 14 | Calendário 2026/27 pendente | Oficial UAE Pro League |
| Tunisia Ligue 1 2026/27 | 16 | 30 jogos por clube segundo fonte secundária | Secundária |
| Tunisia Ligue 2 2026/27 | 28 (provisório) | Grupos regionais; confirmar federação | Secundária |
| South Africa Premiership | — | Calendário confirmado; contagem a fechar | Oficial PSL |
| South Africa Championship | — | Calendário confirmado; contagem a fechar | Oficial PSL |

**Decisão de implementação:** estes dados entram no inventário de validação, não diretamente no banco. O MFO deverá suportar competições com grupos, fases Apertura/Clausura, playoffs, ligas de turno único e divisões geográficas. Só depois de validar o regulamento e a lista de participantes de cada temporada será seguro gerar calendários específicos.


## 9. Complemento — confirmação de participantes e correções de contagem (13/11/2026)

### África do Sul — correção importante
- **Betway Premiership 2026/27: 16 clubes.** A PSL declara expressamente que a primeira divisão tem 16 clubes. Fonte oficial: https://www.psl.co.za/content/125534
- **Motsepe Foundation Championship / National First Division 2026/27: 16 clubes.** A lista oficial de clubes publicada pela PSL contém 16 participantes nesta divisão. Fonte oficial: https://psl.co.za/content/16337
- A temporada inclui playoffs de promoção/rebaixamento. A PSL informa calendário específico para os playoffs entre 23 de maio e 9 de junho de 2027. Portanto, a segunda divisão não deve ser modelada como promoção automática simples sem a fase de playoffs. Fonte oficial: https://www.psl.co.za/news/article/5615294-psl-confirms-the-202627-season-calend

### Coreia do Sul — K League 2
- **K League 2 2026: 17 clubes e 34 rodadas.** A própria K League confirmou a entrada de três novos clubes, totalizando 17, e descreve o formato de duas voltas (2 round-robin), com 34 rodadas e folgas em razão do número ímpar de participantes. Fonte oficial: https://www.kleague.com/news_view.do?category=notice&orderBy=seq&page=1&seq=94436&viewOption=list
- A K League 2 exige tratamento de calendário com um clube de folga por rodada; não é possível aplicar o gerador atual de liga par sem ajuste.
- **K League 1:** permanece a referência de 12 clubes e formato especial de divisão em grupos após a fase regular, já registrada na seção 1; manter o formato oficial e não converter para turno/returno simples.

### Emirados Árabes Unidos — confirmação institucional
- A UAE Pro League declara possuir **14 clubes profissionais** como membros da liga. Fonte oficial: https://www.uaeproleague.ae/en/about
- A lista de clubes é publicada pela própria liga. Fonte oficial: https://www.uaeproleague.ae/en/clubs
- A licença AFC concedida a 13 clubes para o ciclo 2026/27 não significa que a liga tenha apenas 13 participantes; licenciamento AFC e número de participantes são métricas distintas. Fonte oficial: https://uaeproleague.ae/en/news-and-gallery/adnoc-pro-league-938

### Egito — divisões abaixo da Premier League
- A Federação Egípcia publicou para 2025/26 a Segunda Divisão A com **18 clubes** e a Segunda Divisão B com **89 clubes**, distribuídos em três grupos principais subdivididos geograficamente. Fonte oficial EFA: https://efa.eg/ar/الأخبار/اعتماد-نظام-المسابقات-بالموسم-الجديد-2025-2026/
- Esses números são do regulamento 2025/26. Não transferir automaticamente para 2026/27 sem a publicação do novo regulamento.
- Isso confirma que o modelo atual de 10 clubes fictícios na segunda divisão egípcia não representa a pirâmide nacional.

### Atualização do quadro de contagens confirmadas
| Competição | Temporada | Clubes | Fonte / status |
|---|---|---:|---|
| South Africa Betway Premiership | 2026/27 | 16 | Oficial PSL |
| South Africa Motsepe Foundation Championship | 2026/27 | 16 | Lista oficial PSL |
| K League 2 | 2026 | 17 | Oficial K League; 34 rodadas |
| UAE ADNOC Pro League | 2026/27 | 14 | Oficial UAE Pro League |
| Egypt Second Division A | 2025/26 | 18 | Oficial EFA; temporada seguinte pendente |
| Egypt Second Division B | 2025/26 | 89 | Oficial EFA; temporada seguinte pendente |

**Nota de calendário:** a Championship sul-africana tem 16 clubes na lista da PSL, mas sua promoção inclui playoffs; a K League 2 tem 17 clubes e folgas; a K League 1 e a Premier League egípcia têm fases finais. Esses formatos exigem funções específicas no gerador, não apenas mudança do número de clubes.


## 10. Fechamento em lote — rodada final de pesquisa e pendências objetivas (13/11/2026)

### Austrália — A-League Men 2026/27
- **12 clubes, 26 partidas por clube, 156 jogos na temporada regular e playoffs com os seis primeiros.** O regulamento oficial da A-Leagues informa os 12 participantes, 26 jogos por equipe e 156 jogos regulares. O calendário tem 28 matchweeks e cada clube enfrenta os demais pelo menos duas vezes, com alguns confrontos adicionais. Fontes oficiais:
  - Regulamento: https://aleagues.com.au/more/official-documents/
  - Calendário: https://aleagues.com.au/news/aleague-men-2026-2027-fixture-list-revealed-key-dates-fixture-information/
- Correção do inventário: não modelar A-League como 10 clubes e nem como 22 partidas em turno e returno simples.

### Países Baixos
- **Eredivisie 2026/27: 18 clubes**, turno e returno (34 jogos por clube; 306 jogos na fase de liga). A KNVB confirma o formato estrutural de 18 equipes; a tabela oficial da temporada e o calendário 2026/27 corroboram a temporada. Fontes: https://www.knvb.nl/node/81 e https://www.knvb.nl/nieuws/betaald-voetbal/competitiezaken/71918/definitief-competitieprogramma-202627-vastgesteld
- **Eerste Divisie 2026/27: 20 clubes**, com equipes B/beloften e sistema de períodos e playoffs de promoção. A KNVB confirma 20 participantes; o calendário oficial 2026/27 está publicado. Fontes: https://www.knvb.nl/node/81 e https://www.knvb.nl/nieuws/betaald-voetbal/competitiezaken/71918/definitief-competitieprogramma-202627-vastgesteld
- A regra de promoção deve impedir que equipes B subam à Eredivisie; conferir as regras vigentes da temporada ao implementar a tabela de acesso.

### Nova Zelândia — mudança entre 2026 e 2027
- **National League Championship masculina 2026: 11 equipes**, em formato de campeonato nacional com fase final; a federação publicou as 11 participantes e os jogos da fase de Championship. Fonte oficial: https://www.nzfootball.co.nz/newsarticle/170010
- **Nova competição nacional masculina 2027: 12 clubes**, em liga nacional de turno e returno e uma série final. A federação confirmou 222 jogos somando as competições masculina e feminina; a competição masculina tem 12 equipes. Fonte oficial: https://www.nzfootball.co.nz/newsarticle/168426
- Portanto, 2026 e 2027 não podem compartilhar a mesma configuração de calendário. Para o escopo MFO 2026/27, definir se a temporada representada é o formato de 2026 ou o novo formato de 2027.

### Tunísia — detalhamento dos formatos
- **Ligue 1 2026/27: 16 clubes.** A Federação Tunisiana comunicou aos clubes o início da temporada e a manutenção de 16 participantes, conforme informação publicada pela Mosaïque FM. Fonte jornalística que reproduz comunicação da federação: https://www.mosaiquefm.net/mobile/fr/article/1522292
- **Ligue 2 2026/27: 28 clubes em dois grupos de 14.** A informação foi publicada por Mosaïque FM com os grupos e a data de início indicada pela Federação Tunisiana. Fonte: https://www.mosaiquefm.net/mobile/fr/article/1523746
- A página Footlink apresenta 56 jogos para Ligue 1 e 112 para Ligue 2, números que não correspondem ao cálculo de turno e returno simples de 16 clubes (240 jogos) ou dois grupos de 14 (182 jogos no total). Isso é sinal de que a contagem pode estar considerando apenas uma fase, partidas listadas ou outro recorte. **Não usar esses totais sem regulamento oficial completo.**
- Para a Ligue 2, cada grupo de 14 em turno e returno geraria 182 jogos somados entre os grupos (91 por grupo), mas isso é apenas cálculo condicional, não confirmação do regulamento.

### Emirados Árabes — First Division
- **UAE First Division 2026/27: 15 clubes licenciados.** A UAE FA publicou a tabela oficial da competição 2026/27, e a comissão de licenciamento aprovou 15 clubes para a temporada. Fonte oficial de tabela: https://uaefa.ae/en/competition/2572. A lista de licenças foi divulgada por Sharjah24: https://cm.sharjah24.ae/en/Articles/2026/06/04/d41
- A página de standings da UAE Pro League é da primeira divisão profissional e não deve ser confundida com a First Division organizada pela federação. O MFO deve manter os dois níveis como competições distintas.

### Brasil — temporadas 2026
- **Série A: 20 clubes; Série B: 20 clubes; Série C: 20 clubes.** A CBF confirma que Série C 2026 mantém 20 participantes e anuncia mudança para 24 em 2027. A lista consolidada das Séries A/B/C 2026 indica 20 participantes em cada. Fontes:
  - CBF — calendário 2026: https://www.cbf.com.br/a-cbf/noticias/informes-cbf/a/cbf-anuncia-novo-calendario-do-futebol-profissional-masculino
  - CBF — regulamento e tabela Série C 2026: https://www.cbf.com.br/futebol-brasileiro/noticias/selecao-masculina/gabriel-jesus-elogia-companheiro-de-selecao-brasileira/cbf-publica-documentos-tecnicos-da-serie-c-de-2026
  - Lista de participantes A/B/C: https://ge.globo.com/google/amp/pi/futebol/noticia/2025/12/29/brasileirao-veja-os-156-clubes-das-series-a-b-c-e-d-em-2026.ghtml
- O banco atual já tem 20 clubes em cada divisão brasileira, mas os nomes e vínculos precisam ser comparados com a lista oficial de 2026. A Série C 2027 muda para 24 equipes; não reutilizar a configuração de 2026 na próxima temporada.

### Japão — transição para 2026/27
- A Associação Japonesa de Futebol confirma a mudança de temporada: a partir de 2026/27 o campeonato passa a começar em agosto e terminar em maio/junho, com pausa de inverno de meados de dezembro a meados de fevereiro. J1, J2 e J3 têm 20 clubes cada. Fonte oficial JFA: https://jfa.jp/documents/faq/inquiry.html
- Os calendários e partidas de 2026 ainda incluem a competição especial de transição; não presumir que a contagem de jogos e rodadas seja idêntica ao modelo antigo de ano civil. As páginas oficiais J.League mostram as partidas e matchweeks da temporada de transição: https://www.jleague.co/fixtures/j1/2026/latest/ e https://www.jleague.co/id/match/j2/2026090502/
- Para o MFO, separar a edição especial de transição 2026 do campeonato 2026/27 regular e não gerar 380 jogos sem o regulamento específico da nova temporada.

### Espanha — Segunda División
- **LALIGA HYPERMOTION 2026/27: 22 clubes.** A tabela oficial da própria LALIGA lista 22 participantes. Fonte oficial: https://www.laliga.com/en-ES/laliga-hypermotion/standing
- Em liga de turno e returno, a conta matemática é 42 partidas por clube e 462 jogos. Confirmar o calendário oficial antes da geração.

### Matriz de status consolidada — as 39 competições previstas no MFO

| País | Divisão 1 | Divisão 2 | Divisão 3 | Situação geral |
|---|---|---|---|---|
| África do Sul | 16 | 16 | — | Participantes confirmados; formato e playoffs a modelar |
| Alemanha | 18 | 18 | — | Contagem confirmada; calendário de liga regular |
| Arábia Saudita | 18 | 18 | — | Contagens confirmadas; conferir regulamento da D2 |
| Argentina | 30 | 36 | — | D1 em grupos/Apertura-Clausura; D2 em zonas |
| Austrália | 12 | — | — | 26 jogos por clube + finais |
| Brasil | 20 | 20 | 20 | Confirmadas para 2026; lista de clubes deve ser reconciliada |
| Coreia do Sul | 12 | 17 | — | K1 com fase/grupos; K2 com folgas e playoffs |
| Egito | 20 | D2 A 18 / D2 B 89* | — | D1 em fases; D2 usa estrutura de grupos; temporada 2026/27 pendente |
| Emirados Árabes | 14 | 15 | — | Contagens confirmadas; calendários separados por organizador |
| Espanha | 20 | 22 | — | Contagens confirmadas; D2 com playoffs de promoção |
| França | 18 | 18 | — | Contagens confirmadas; confirmar playoffs de acesso |
| Países Baixos | 18 | 20 | — | Contagens confirmadas; D2 inclui equipes B e períodos |
| Inglaterra | 20 | 24 | — | Contagens confirmadas; Championship com playoffs |
| Itália | 20 | 20 | — | D1 confirmada; D2 requer conferência final de lista oficial |
| Japão | 20 | 20 | — | Contagens confirmadas; transição de temporada exige regras específicas |
| Marrocos | 16 | 16 | — | Contagens confirmadas; calendário a validar por regulamento |
| México | 18 | 16 | — | Contagens ainda precisam de regulamento oficial da temporada |
| Nova Zelândia | 11 (2026) / 12 (2027) | — | — | Mudança de formato entre temporadas |
| Portugal | 18 | 18 | — | Contagens confirmadas; playoffs e equipes B |
| Tunísia | 16 | 28 | — | D2 em dois grupos; confirmar regulamento e número de jogos |

*Egito D2 A/B: os valores 18 e 89 referem-se ao regulamento publicado para 2025/26, não são aprovados automaticamente para 2026/27. A soma das divisões planejadas no MFO é 39 competições (20 países com 1 a 3 divisões); a tabela acima descreve os níveis atualmente previstos, sem adicionar divisões nacionais extras como a D2 B egípcia ou D3 japonesa.

### Conclusão honesta da validação
A pesquisa em lote já permite substituir muitas quantidades artificiais de 10 clubes por números reais de participantes, mas **a auditoria ainda não está liberada para importação automática de todos os 39 campeonatos**. Permanecem pendentes:
1. Lista nominal oficial e IDs atuais para cada competição — a contagem de clubes, sozinha, não identifica quais registros devem ser mantidos ou substituídos.
2. Regulamentos completos da temporada 2026/27 para Egito D2, México, Itália Serie B, Tunísia e algumas divisões secundárias.
3. Modelagem de formatos especiais: A-League, Japão em transição, Coreia, Egito, Argentina, Tunísia, Nova Zelândia, playoffs ingleses e holandeses.
4. Decisão de escopo sobre divisões muito grandes ou geográficas, em especial Egito D2 B (89 clubes) e níveis abaixo das duas divisões profissionais selecionadas.

**Nenhum dado do Supabase foi alterado nesta rodada.** Os 420 clubes IA, 8.580 jogadores IA e 4.380 jogos pendentes permanecem como estavam na auditoria anterior. Não executar SQL de escrita com base apenas neste documento.
