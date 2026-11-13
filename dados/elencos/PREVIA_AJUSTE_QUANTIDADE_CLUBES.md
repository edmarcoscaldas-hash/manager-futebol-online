# Prévia de ajuste da quantidade de clubes por liga — MFO

**Data:** 13/11/2026  
**Status:** planejamento; não executar no Supabase ainda.  
**Objetivo:** alinhar cada competição à quantidade de participantes da edição 2026/27 (ou 2026 nas ligas de calendário civil), sem misturar temporadas e sem apagar dados silenciosamente.

## 1. Estado atual confirmado no relatório Supabase

- 39 ligas cadastradas.
- 420 clubes de IA: 36 ligas com 10 clubes e 3 divisões brasileiras com 20 clubes.
- 8.580 jogadores de IA (220 por liga).
- 30 clubes sem jogadores nas três divisões brasileiras (10 por divisão).
- 4.380 partidas existentes e todas pendentes: 36 ligas × 90 partidas + 3 ligas × 380 partidas.
- Nenhuma partida disputada.
- Nenhum clube de usuário vinculado às 39 ligas no relatório.

**Correção matemática importante:** o total correto é 4.380 partidas, não 3.800.

## 2. Prévia de quantidades por competição

Os números abaixo foram transcritos do relatório de coleta de elencos existente no repositório. São uma **base preliminar de participantes**, não uma autorização para inserir/remover clubes. Antes de gerar SQL de alteração, cada lista de participantes deverá ser conferida contra a organização oficial da competição e a temporada correta.

| País | Competição | Atual no MFO | Quantidade preliminar da coleta | Observação |
|---|---|---:|---:|---|
| África do Sul | South African Premiership | 10 | 16 | Confirmar participantes da temporada |
| África do Sul | Motsepe Foundation Championship | 10 | 16 | Confirmar participantes da temporada |
| Alemanha | Bundesliga | 10 | 18 | Participantes listados |
| Alemanha | 2. Bundesliga | 10 | 18 | Participantes listados |
| Arábia Saudita | Saudi Pro League | 10 | 18 | Participantes listados |
| Arábia Saudita | Saudi First Division League | 10 | 18 | Participantes listados |
| Argentina | Liga Profesional de Fútbol | 10 | 30* | O relatório tem 29 cabeçalhos, embora declare 30 |
| Argentina | Primera Nacional | 10 | 36 | Participantes listados |
| Austrália | A-League Men | 10 | 12 | Participantes listados |
| Brasil | Série A | 20 | 20 | O pacote de elencos não contém a lista nominal |
| Brasil | Série B | 20 | 20 | O pacote de elencos não contém a lista nominal |
| Brasil | Série C | 20 | 20** | O pacote cita 23 clubes de 2027 + vaga a confirmar; não usar essa lista como Série C 2026 |
| Coreia do Sul | K League 1 | 10 | 12*** | Base de 2026; não rotular como temporada 2026/27 |
| Coreia do Sul | K League 2 | 10 | 17 | Confirmar formato/participantes da edição |
| Egito | Egyptian Premier League | 10 | 20 | Participantes listados |
| Egito | Egyptian Second Division | 10 | 20 | Confirmar formato e divisão exata |
| Emirados Árabes Unidos | UAE Pro League | 10 | 14 | Participantes listados |
| Emirados Árabes Unidos | UAE First Division League | 10 | 15 | Participantes listados |
| Espanha | La Liga | 10 | 20 | Participantes listados |
| Espanha | Segunda División | 10 | 22 | Participantes listados |
| França | Ligue 1 | 10 | 18 | Participantes listados |
| França | Ligue 2 | 10 | 18 | Participantes listados |
| Países Baixos | Eredivisie | 10 | 18 | Participantes listados |
| Países Baixos | Eerste Divisie | 10 | 20 | Participantes listados |
| Inglaterra | Premier League | 10 | 20 | Participantes listados |
| Inglaterra | Championship | 10 | 24 | Participantes listados |
| Itália | Serie A | 10 | 20 | Participantes listados |
| Itália | Serie B | 10 | 20 | Participantes listados |
| Japão | J1 League | 10 | 20 | Confirmar temporada civil 2026 |
| Japão | J2 League | 10 | 20 | Confirmar temporada civil 2026 |
| Marrocos | Botola Pro | 10 | 16 | Participantes listados |
| Marrocos | Botola Pro D2 | 10 | 16 | Participantes listados |
| México | Liga MX | 10 | 18 | Participantes listados |
| México | Liga de Expansión MX | 10 | 16 | Participantes listados |
| Nova Zelândia | National League masculina | 10 | 12 | Confirmar edição/estrutura de 2026/27 |
| Portugal | Liga Portugal Betclic | 10 | 18 | Participantes listados |
| Portugal | Liga Portugal 2 | 10 | 18 | Participantes listados |
| Tunísia | Tunisian Ligue 1 | 10 | 16 | Participantes listados |
| Tunísia | Tunisian Ligue 2 | 10 | A confirmar | Ausente no pacote de coleta |

\* A Liga Profesional precisa ser reconciliada: 29 cabeçalhos nominais versus 30 declarados.  
\** Não substituir automaticamente os clubes de 2026 pelos participantes de 2027.  
\*** A K League 1 foi coletada como edição civil de 2026; o pacote registra mudança de formato para 2027.  
**Tunísia Ligue 2:** não há quantidade confirmada no pacote. Não preencher por estimativa.

A soma preliminar das 38 linhas com quantidade numérica é **710 clubes**. Esse subtotal não inclui a Tunisian Ligue 2 e ainda contém divergências/temporadas que precisam ser resolvidas; portanto, não é o total final aprovado.

## 3. Impacto no calendário

O calendário atual foi gerado para 10 clubes nas ligas estrangeiras e 20 clubes nas três divisões brasileiras. A quantidade de partidas muda quando a competição muda de tamanho:

- Turno e returno em grupo único: N × (N − 1) partidas por liga.
- Exemplo: 10 clubes = 90 partidas; 16 = 240; 18 = 306; 20 = 380; 22 = 462; 24 = 552.
- Competições com grupos, fases, playoffs, abertura/encerramento ou formatos especiais não devem ser tratadas automaticamente como turno e returno simples.

Assim, não é tecnicamente correto apenas adicionar clubes e manter os jogos antigos como se o calendário continuasse válido. Também não devemos apagar os 4.380 jogos existentes sem uma etapa explícita de preservação e aprovação.

## 4. Estratégia segura proposta

1. **Congelar o calendário atual:** nenhuma alteração em `matches` nesta fase.
2. **Conferir as 39 listas oficiais de participantes:** país, nome oficial, temporada, divisão e formato da competição.
3. **Gerar uma prévia de correspondência:** comparar os clubes existentes por liga e nome/alias; indicar quais serão mantidos, renomeados, adicionados ou eventualmente substituídos.
4. **Preservar IDs sempre que possível:** se um clube existente corresponder ao participante oficial, manter seu `club_id`; não recriar o mesmo clube.
5. **Não excluir automaticamente:** clubes sem correspondência ficam em uma lista de revisão. Clubes de usuários nunca devem ser removidos ou movidos por uma rotina de seed.
6. **Resolver a quantidade final e o formato de cada liga:** especialmente Argentina, Coreia, Egito, Emirados, Japão, Nova Zelândia e Tunísia.
7. **Só depois preparar uma migration transacional:** com cópia/arquivo do calendário antigo, criação dos novos participantes e geração do calendário compatível com cada formato. A execução dependerá de aprovação expressa.
8. **Tratar os elencos em etapa separada:** os 30 clubes brasileiros sem jogadores precisam ser preenchidos; dados fictícios devem ser identificados como fictícios, e atributos de jogo não devem ser apresentados como dados reais.

## 5. O que esta prévia NÃO faz

- Não executa SQL no Supabase.
- Não altera nomes, IDs ou quantidades de clubes.
- Não apaga nem regenera partidas.
- Não altera os jogadores existentes.
- Não importa automaticamente o ZIP nem declara completos os elencos reais.

## 6. Próximo passo técnico

Concluir a validação oficial das quantidades e formatos por temporada e, em seguida, produzir um segundo arquivo com:
- lista final dos participantes por liga;
- correspondência com os `club_id` atuais;
- lista de clubes a manter/adicionar/revisar;
- quantidade exata de jogos esperada por competição;
- plano de preservação e regeneração do calendário.

**Somente após essa prévia detalhada e sua aprovação será preparado o SQL de migração.**
