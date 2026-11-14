# Status da pré-importação de elencos reais — MFO

**Data da auditoria:** 14/11/2026  
**Status:** auditoria documental avançada; **prévia de importação ainda não liberada**.  
**Segurança:** nenhum SQL foi executado nesta etapa; nenhum dado, clube, jogador ou calendário do Supabase foi alterado.

## 1. Estrutura atual do MFO

A tabela de resumo enviada pelo usuário confirma:

- 39 ligas cadastradas em 20 países.
- 420 clubes de IA: 36 ligas com 10 clubes e as três divisões brasileiras com 20 clubes cada.
- 4.380 partidas já cadastradas.
- Nenhum clube de usuário vinculado às ligas no resumo recebido.

A conta dos jogos é coerente com a estrutura atual: 36 ligas de 10 clubes geram 36 × 90 = 3.240 partidas; as três ligas brasileiras de 20 clubes geram 3 × 380 = 1.140; total de 4.380.

**Regra aplicada nesta auditoria:** preservar os 420 clubes e os 4.380 jogos existentes. Não foi proposto nem executado ajuste de clubes ou calendário.

## 2. Conferência dos arquivos enviados

### QKeCjEBQnKVBREEc.md

O arquivo contém 39 seções de competição após o título: 37 cabeçalhos de futebol e duas seções que não são futebol (NBB/basquete e Liga Nacional de Futsal). As duas seções não futebolísticas foram excluídas.

Das 37 seções de futebol:
- 36 têm conteúdo de competição, ainda que algumas não tragam elencos nominais.
- Tunisian Ligue 2 é apenas um cabeçalho/relatório pendente.
- Brasil Série A e Brasil Série B não aparecem no pacote.
- Brasil Série C está descrita para 2027; não serve como confirmação de elencos da edição 2026.
- K League 1 não tem temporada oficial 2026/27: a edição pertinente é a temporada civil 2026.
- A seção da New Zealand National League é de 2027; para o pedido de temporada civil 2026, a contagem de referência é 11 clubes e os nomes de 2027 não foram reaproveitados.
- A seção da K League 2 traz menções de jogadores em uma prévia oficial de rodada, não um cadastro de elenco. Esses nomes não foram tratados como jogadores prontos para importação.
- Na Eerste Divisie, 16 nomes aparecem em estatísticas; não são uma lista de elenco e foram excluídos da contagem importável.

### vUbdfkKhDqClWlPV.md

O arquivo trata exclusivamente das eliminatórias masculinas da Copa do Mundo FIFA 2026, organizadas por confederação (AFC, CAF, Concacaf, CONMEBOL, OFC e UEFA). Contém seleções participantes e classificadas, não elencos de clubes nem listas nominais de jogadores. Foi separado do pacote de importação de clubes; poderá servir de referência futura para o módulo de seleções.

### Arquivos auxiliares

- AUDITORIA_PRE_IMPORTACAO.md: registra corretamente que a importação depende de conferir o banco e de separar jogadores principais, U21/base e nomes citados apenas em estatísticas.
- VALIDACAO_FORMATOS_COMPETICOES.md: fornece a matriz mais recente de participantes por competição, com algumas contagens provisórias ou de temporadas diferentes.
- PREVIA_AJUSTE_QUANTIDADE_CLUBES.md: registra uma fotografia anterior do banco com 8.580 jogadores de IA e 30 clubes brasileiros sem jogadores. Esse total equivale a 390 clubes preenchidos × 22 jogadores; não foi revalidado nesta execução porque não foi feita consulta ao banco.
- EXPORTACAO_AUDITORIA_RECONCILIACAO.sql: consulta somente leitura preparada para devolver club_id, nome atual, contagem de jogadores e partidas, além do elenco nominal atual. Não foi executada.

## 3. Comparação das 39 ligas

A coluna “participantes reais” vem da matriz de validação documental. “Confiança” sinaliza quando a contagem é oficial, provisória ou de uma temporada que não corresponde integralmente a 2026/27. A coluna de jogadores conta nomes encontrados no relatório consolidado, não elencos completos nem quantidade final aprovada para importação.

| Liga MFO | País | Clubes MFO | Participantes reais de referência | Nomes encontrados no relatório | Situação dos nomes / observação |
|---|---|---:|---:|---:|---|
| South African Premiership | África do Sul | 10 | 16 | 0 | Participantes confirmados; sem elenco nominal |
| Motsepe Foundation Championship | África do Sul | 10 | 16 | 0 | Participantes confirmados; sem elenco nominal |
| Bundesliga | Alemanha | 10 | 18 | 479 | 15 clubes com listas, Frankfurt com fragmento de 5 nomes; Augsburg e Mainz sem nomes |
| 2. Bundesliga | Alemanha | 10 | 18 | 533 | Listas nominais por clube em fonte oficial |
| Saudi Pro League | Arábia Saudita | 10 | 18 | 551 | Lista oficial; uma repetição exata no mesmo clube removida da contagem |
| Saudi First Division | Arábia Saudita | 10 | 18 | 358 | Fonte secundária e cobertura parcial; uma repetição no mesmo clube removida |
| Liga Argentina — 1ª divisão | Argentina | 10 | 30 | 0 | Participantes confirmados; sem elencos nominais |
| Liga Argentina — 2ª divisão | Argentina | 10 | 36 | 0 | Contagem de referência secundária; sem elencos nominais |
| A-League Men | Austrália | 10 | 12 | 417 | Guia oficial, mas mistura lista principal e jovens; uma duplicidade entre clubes pendente |
| Liga Nacional — 1ª divisão | Brasil | 20 | 20 | 0 | Participantes 2026 confirmados; elencos Série A ausentes |
| Liga Nacional — 2ª divisão | Brasil | 20 | 20 | 0 | Participantes 2026 confirmados; elencos Série B ausentes |
| Brasileirão Série C | Brasil | 20 | 20 em 2026 | 0 | O relatório traz participantes de 2027, não elencos 2026 |
| K League 1 | Coreia do Sul | 10 | 12 em 2026 | 0 | Temporada civil 2026; não existe edição 2026/27 |
| K League 2 | Coreia do Sul | 10 | 17 em 2026 | 65 menções | Prévia oficial, não lista de elenco; não importável como roster |
| Egyptian Premier League | Egito | 10 | 20 | 0 | Participantes indicados; regulamento oficial da temporada ainda pendente |
| Egyptian Second Division | Egito | 10 | 18 (D2 A, 2025/26) | 0 | Contagem não confirma a edição 2026/27; divisão seguinte pendente |
| UAE Pro League | Emirados Árabes Unidos | 10 | 14 | 0 | Participantes confirmados; sem nomes de jogadores |
| UAE First Division | Emirados Árabes Unidos | 10 | 15 | 0 | Participantes confirmados; sem elenco nominal |
| La Liga | Espanha | 10 | 20 | 0 | Participantes confirmados; sem elencos nominais |
| Segunda División | Espanha | 10 | 22 | 0 | Contagem provisória na matriz; sem elencos nominais |
| Ligue 1 | França | 10 | 18 | 180 | Nomes parciais de nove clubes, fonte secundária |
| Ligue 2 | França | 10 | 18 | 0 | Participantes confirmados; sem nomes nominais |
| Eredivisie | Holanda | 10 | 18 | 543 | Páginas oficiais de elenco para os 18 clubes |
| Eerste Divisie | Holanda | 10 | 20 | 0 | 16 nomes citados em estatísticas foram excluídos por não serem roster |
| Premier League | Inglaterra | 10 | 20 | 566 | Relação oficial de números de camisa; inclui atletas de academia |
| Championship | Inglaterra | 10 | 24 | 572 + 595 U21 | Lista oficial EFL; lista principal e contratos U21 mantidos separados |
| Serie A | Itália | 10 | 20 | 40 | Apenas Juventus; página oficial sem data de atualização/temporada explícita |
| Serie B | Itália | 10 | 20 | 743 | Lista oficial Lega B 2026/27; uma duplicidade entre clubes pendente |
| J1 League | Japão | 10 | 20 | 0 | Participantes confirmados; sem nomes nominais |
| J2 League | Japão | 10 | 20 | 685 | Páginas oficiais J.League; uma duplicidade entre clubes pendente |
| Botola Pro | Marrocos | 10 | 16 | 487 | Listas nominais de fonte secundária; requer validação por clube |
| Botola 2 | Marrocos | 10 | 16 | 0 | Participantes confirmados; sem nomes nominais |
| Liga MX | México | 10 | 18 | 0 | Contagem provisória; sem elencos nominais |
| Liga de Expansión MX | México | 10 | 16 | 426 | Plantillas em páginas oficiais; dois nomes repetidos entre clubes pendentes |
| New Zealand National League | Nova Zelândia | 10 | 11 em 2026 | 0 | O relatório contém 2027; nenhum elenco 2026 confirmado |
| Liga Portugal | Portugal | 10 | 18 | 0 | Participantes confirmados; sem elencos nominais |
| Liga Portugal 2 | Portugal | 10 | 18 | 19 | Amostra parcial do Benfica B em fonte secundária; não representa a liga |
| Tunisian Ligue 1 | Tunísia | 10 | 16 | 0 | Contagem secundária/provisória; sem elencos nominais |
| Tunisian Ligue 2 | Tunísia | 10 | 28 (provisório) | 0 | Relatório pendente; contagem secundária ainda não confirmada pela federação |

A soma aritmética dos participantes de referência da matriz é 735, contra 420 clubes no MFO. **735 não é uma contagem oficial consolidada**, pois inclui linhas provisórias, uma divisão egípcia da temporada 2025/26 e formatos que ainda precisam de confirmação. A diferença demonstra, porém, que a estrutura atual de 10 clubes em quase todas as ligas não representa a quantidade integral de participantes de várias competições reais.

## 4. Nomes nominais encontrados e deduplicação

Contagens documentais extraídas do QKeCjEBQnKVBREEc.md:

| Competição | Ocorrências nominais | Nomes distintos no relatório | Cobertura |
|---|---:|---:|---|
| Bundesliga | 479 | 479 | 15 listas completas e um fragmento |
| 2. Bundesliga | 533 | 533 | 18 clubes |
| Saudi Pro League | 552 | 551 | 18 clubes; repetição dentro do Al-Nassr |
| Saudi First Division | 359 | 358 | 18 clubes; fonte secundária e parcial |
| A-League Men | 418 | 417 | 12 clubes; mistura jovens e lista principal |
| Ligue 1 | 180 | 180 | 9 clubes; fonte secundária e parcial |
| Eredivisie | 543 | 543 | 18 clubes |
| Premier League | 566 | 566 | 20 clubes; inclui academia |
| Championship — lista principal | 572 | 572 | 24 clubes |
| Championship — U21 | 595 | 595 | 24 clubes; categoria separada |
| Serie A | 40 | 40 | Juventus apenas; data de atualização não indicada |
| Serie B | 744 | 743 | 20 clubes; repetição de nome entre dois clubes |
| J2 League | 686 | 685 | 20 clubes; repetição de nome entre dois clubes |
| Botola Pro | 487 | 487 | 16 clubes; fonte secundária |
| Liga de Expansión MX | 428 | 426 | 16 clubes; duas repetições entre clubes |
| Liga Portugal 2 | 19 | 19 | Benfica B apenas; fonte secundária e parcial |

A contagem não inclui os 65 nomes citados apenas na prévia da K League 2 nem os 16 nomes da Eerste Divisie que aparecem somente em estatísticas. Esses registros foram preservados como pistas de pesquisa, não como elencos importáveis.

### Duplicidades detectadas

Foram identificados 15 grupos de nomes exatamente repetidos após normalização de acentos e pontuação:

- **Duas repetições no mesmo clube**, a retirar uma vez cada: Abdulrahman Sufyani (Al-Nassr) e Ibrahim Al-Nakhli (Al-Jabalain FC).
- **Treze conflitos entre clubes ou competições**, que não devem ser resolvidos automaticamente sem data de nascimento, posição ou confirmação de transferência: Ethan Nwaneri; Mikey Moore; Bernardo; Jonas Hofmann; Adrian Šemper; Ahmed Al-Shamrani; Fahad Al-Rashidi; Abdulrahman Al-Obaid; Aston Burns; Francesco Conti; マテウス モラエス; Jesús Hernández; Cristian González.

Os conflitos entre clubes podem ser transferências, empréstimos ou homônimos. Não foram apagados silenciosamente nem tratados como pessoas diferentes sem prova.

## 5. Complementação fictícia — o que pode e o que não pode ser calculado

A fotografia anterior registrada em PREVIA_AJUSTE_QUANTIDADE_CLUBES.md indica 22 jogadores por clube, 8.580 jogadores de IA e 30 clubes brasileiros sem jogadores. Essa fotografia não foi reconsultada no banco nesta execução.

Se esses números ainda forem válidos:
- 390 clubes preenchidos × 22 = 8.580 jogadores existentes.
- 30 clubes brasileiros vazios × 22 = **660 vagas de elenco** a preencher.
- Como o relatório não fornece elencos 2026 confirmados para as três divisões brasileiras, essas 660 vagas exigiriam jogadores fictícios até que fontes nominais adequadas sejam obtidas.

Para as outras ligas, a complementação fictícia **não pode ser calculada com segurança**: as listas reais cobrem clubes oficiais em quantidades diferentes das 10 vagas existentes no MFO e ainda não há correspondência entre os clubes-fonte e os club_id atuais. Não se deve distribuir jogadores aleatoriamente entre clubes.

## 6. Compatibilidade com o esquema Supabase

O relatório nominal fornece principalmente nomes e clube de origem. Para muitos registros faltam campos necessários ou usados pelo jogo:

- club_id do clube atual no Supabase;
- posição;
- data de nascimento/idade;
- nacionalidade;
- overall e potencial;
- valor de mercado;
- salário mensal e demais campos contratuais;
- classificação de jogador principal, U21/base ou atleta apenas mencionado em estatísticas.

A lista nominal, por si só, não é um INSERT válido em public.players. Não foram inventados valores, posições, idades, salários ou overall para preencher essas lacunas. Qualquer atributo de jogo gerado artificialmente deverá ser identificado como fictício, separado dos fatos biográficos.

## 7. Bloqueios objetivos para liberar a prévia de importação

1. **Falta o inventário nominal atual do Supabase.** O resumo recebido contém league_id e quantidade de clubes, mas não contém club_id e nome de cada clube. A consulta EXPORTACAO_AUDITORIA_RECONCILIACAO.sql está pronta no repositório e é somente leitura, mas não foi executada nesta tarefa.
2. **Há conflito entre preservar 420 clubes e representar todas as competições reais.** A matriz documental aponta participantes acima de 10 em 36 ligas. Mantendo os 420 clubes e os 4.380 jogos, será necessário escolher quais 10 clubes reais representarão cada liga que oficialmente tem 11 a 36 participantes. Não há critério autorizado para escolher esse subconjunto.
3. **Os nomes não bastam para preencher todos os campos de jogadores.** As lacunas de posição, idade, nacionalidade e atributos de jogo precisam de fontes adicionais ou de uma regra explícita de atributos fictícios.
4. **Há lacunas nominais relevantes.** Brasil Série A/B, Brasil Série C 2026, África do Sul, Argentina, Egito, Emirados, Espanha, França Ligue 2, Japão J1, Marrocos D2, México Liga MX, Nova Zelândia 2026, Portugal e Tunísia ainda não têm elencos completos verificáveis no pacote.

### Próxima ação técnica necessária

Para continuar sem modificar o banco ou os calendários, é necessário obter a saída de leitura da consulta EXPORTACAO_AUDITORIA_RECONCILIACAO.sql (principalmente os resultados 1 e 2), que contém os club_id, nomes atuais e jogadores existentes. Depois disso, deve ser aplicada uma regra explícita de correspondência dos clubes reais às 10 vagas de cada liga, mantendo as três divisões brasileiras com 20 clubes.

## 8. Fontes principais e rastreabilidade

As referências específicas por competição permanecem no relatório consolidado QKeCjEBQnKVBREEc.md e na matriz VALIDACAO_FORMATOS_COMPETICOES.md. Entre as fontes oficiais verificadas novamente em 14/11/2026 estão:

- Premier League — números dos elencos 2026/27, publicação de 22/09/2026: https://www.premierleague.com/en/news/4725682/all-20-premier-league-clubs-squad-numbers-for-202627-season
- EFL — listas de elenco e contratos U21 2026/27, publicação de 08/09/2026: https://www.efl.com/news/2026/september/08/efl-squad-list--season-2026-27/
- Lega B — lista nominal oficial de jogadores 2026/2027: https://www.legab.it/seriebkt/giocatori
- Bundesliga — elencos por clube 2026/27: https://www.bundesliga.com/en/bundesliga/clubs
- 2. Bundesliga — elencos por clube 2026/27: https://www.bundesliga.com/en/2bundesliga/clubs
- A-League Men — guia oficial 2026/27: https://aleagues.com.au/wp-content/uploads/sites/17/2026/10/A-League_Men_2026-27_Season_Guide.pdf
- J.League — guia de jogadores 2026/27: https://www.jleague.jp/news/article/34439/
- Liga BBVA Expansión MX — plantillas oficiais: https://www.ligabbvaexpansion.mx/

## 9. Conclusão

A auditoria documental e a separação do conteúdo de futebol foram realizadas. Há uma base nominal relevante em algumas competições, mas o material ainda **não está pronto para importação**. Não foi gerado SQL de INSERT nem arquivo CSV apresentado como importável, porque faltam os club_id atuais, a correspondência dos clubes reais com as vagas do MFO e atributos essenciais dos jogadores.

Os 4.380 jogos, os 420 clubes e os dados existentes permanecem intocados.
