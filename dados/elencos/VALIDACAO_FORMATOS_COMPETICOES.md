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
