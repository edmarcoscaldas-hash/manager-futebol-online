# Auditoria pré-importação — elencos reais MFO

**Data da auditoria:** 13/11/2026  
**Escopo:** pacote de elencos no branch `main`; somente futebol masculino de clubes; temporada 2026/27 ou 2026 para ligas de ano civil.  
**Banco:** nenhuma consulta de escrita foi feita. Nenhum SQL foi executado. Calendários não foram alterados.

## Resultado executivo

O arquivo consolidado `QKeCjEBQnKVBREEc.md` tem **38 relatórios de competição**, mas o plano do MFO contém **39 ligas**. Duas seções não são futebol (NBB/basquete e Liga Nacional de Futsal) e devem ser descartadas. A Tunisian Ligue 2 está explicitamente pendente. Portanto, o pacote não cobre as 39 ligas do jogo.

O documento também não é uma base de elencos completa: em muitas ligas lista clubes e links externos, mas não transcreve nomes de jogadores. A ausência de nomes significa falta de verificação na coleta, não elenco vazio. Não converter contagens do Transfermarkt em jogadores e não reaproveitar elencos de temporadas anteriores.

## Conferência das 39 ligas planejadas

| # | País | Liga planejada | Seção correspondente no pacote | Clubes informados no relatório | Situação dos jogadores |
|---:|---|---|---|---:|---|
| 1 | África do Sul | South African Premiership | league-01 | 16 | Sem nomes nominais verificados |
| 2 | África do Sul | Motsepe Foundation Championship | league-02 | 16 | Sem nomes nominais verificados |
| 3 | Alemanha | Bundesliga | league-03 | 18 | Listas nominais parciais; 2 clubes incompletos e 1 seção parcial |
| 4 | Alemanha | 2. Bundesliga | league-04 | 18 | Listas nominais por clube, atribuídas às páginas oficiais da Bundesliga |
| 5 | Arábia Saudita | Saudi Pro League | league-05 | 18 | Listas nominais por clube, atribuídas ao portal oficial SPL; requer deduplicação/validação |
| 6 | Arábia Saudita | Saudi First Division League | league-06 | 18 | Cobertura nominal parcial; não assumir elenco integral |
| 7 | Argentina | Liga Profesional de Fútbol | league-07 | 29 cabeçalhos (texto declara 30) | Nenhum jogador nominalmente confirmado |
| 8 | Argentina | Primera Nacional | league-08 | 36 | Nenhum jogador nominalmente confirmado |
| 9 | Austrália | A-League Men | league-09 | 12 | Listas nominais do guia oficial 2026/27; revisar duplicidades entre clubes |
| 10 | Brasil | Série A | — | — | **Ausente** |
| 11 | Brasil | Série B | — | — | **Ausente** |
| 12 | Brasil | Série C | league-12 | 23 clubes de 2027 + 1 vaga a confirmar | Sem jogadores confirmados para 2027; não substitui a Série A/B nem uma base 2026 |
| 13 | Coreia do Sul | K League 1 | league-13 | 12 em 2026 | **Temporada incompatível:** o relatório admite que não existe edição 2026/27; 2027 muda para 14 clubes |
| 14 | Coreia do Sul | K League 2 | league-14 | 17 | Nomes citados em prévia 2026, cobertura parcial e não elenco integral |
| 15 | Egito | Egyptian Premier League | league-15 | 20 | Nenhum nome nominal; apenas links e contagens externas |
| 16 | Egito | Egyptian Second Division | league-16 | 20 | Nenhum nome nominal verificado |
| 17 | Emirados Árabes Unidos | UAE Pro League | league-17 | 14 | Nenhum nome nominal recuperado |
| 18 | Emirados Árabes Unidos | UAE First Division League | league-18 | 15 | Apenas alguns nomes em estatística de gols; não são elencos completos |
| 19 | Espanha | La Liga | league-19 | 20 | Nenhum elenco nominal completo recuperado |
| 20 | Espanha | Segunda División | league-20 | 22 | Cobertura nominal incompleta; requer conferência clube a clube |
| 21 | França | Ligue 1 | league-21 | 18 | Listas parciais em parte dos clubes; não integral |
| 22 | França | Ligue 2 | league-22 | 18 | Nenhum nome nominal confirmado no relatório |
| 23 | Países Baixos | Eredivisie | league-23 | 18 | Listas nominais por clube atribuídas às páginas oficiais da liga |
| 24 | Países Baixos | Eerste Divisie | league-24 | 20 | Nenhum elenco nominal recuperado |
| 25 | Inglaterra | Premier League | league-25 | 20 | Lista oficial de números de camisa; a seção precisa ser validada integralmente antes de importar |
| 26 | Inglaterra | Championship | league-26 | 24 | Listas oficiais EFL de elenco principal e U21; normalizar nomes e separar categorias |
| 27 | Itália | Serie A | league-27 | 20 | Cobertura nominal insuficiente; há uma lista agregada que precisa ser corretamente atribuída ao clube |
| 28 | Itália | Serie B | league-28 | 20 | O relatório cita a lista oficial de jogadores, mas precisa extrair e atribuir os nomes por equipe |
| 29 | Japão | J1 League | league-29 | 20 | Sem nomes nominais recuperados no relatório |
| 30 | Japão | J2 League | league-30 | 20 | Há listas nominais em japonês em páginas de clubes; confirmar que o recorte corresponde à edição civil 2026 |
| 31 | Marrocos | Botola Pro | league-31 | 16 | Listas nominais por clube, fonte secundária; deduplicar e validar vínculos |
| 32 | Marrocos | Botola Pro D2 | league-32 | 16 | Nenhum nome nominal verificado |
| 33 | México | Liga MX | league-33 | 18 | Nenhum nome nominal; links de plantel não equivalem a dados extraídos |
| 34 | México | Liga de Expansión MX | league-34 | 16 | Cobertura nominal incompleta/ausente |
| 35 | Nova Zelândia | National League masculina | league-35 | 12 | Nenhum nome de elenco 2027 verificado |
| 36 | Portugal | Liga Portugal Betclic | league-36 | 18 | Nenhum nome nominal confirmado |
| 37 | Portugal | Liga Portugal 2 | league-37 | 18 | Apenas amostra parcial de 19 jogadores do Benfica B |
| 38 | Tunísia | Tunisian Ligue 1 | league-38 | 16 | Nenhum nome nominal transcrito |
| 39 | Tunísia | Tunisian Ligue 2 | — | — | **Relatório pendente** |

## Conteúdo que deve ser excluído

- `league-10`: NBB CAIXA — basquete.
- `league-11`: Liga Nacional de Futsal — futsal.

Essas seções não podem alimentar tabelas de clubes ou jogadores do MFO.

## Verificações importantes antes de gerar o SQL de importação

1. **Quantidade de clubes:** os participantes listados no pacote variam de 12 a 36 por liga. Isso não coincide necessariamente com os cadastros atuais do jogo. É necessário obter a distribuição atual por liga no Supabase para evitar remover, duplicar ou deslocar clubes.
2. **Calendário:** preservar os 4.380 jogos existentes. Nenhuma operação de calendário faz parte desta auditoria.
3. **Identificação:** fazer correspondência por liga + nome normalizado do clube, mas manter o nome oficial original em coluna própria. Não associar jogador a um clube apenas por nome parecido.
4. **Jogadores:** deduplicar por nome normalizado e clube/temporada; manter homônimos em clubes diferentes quando a fonte os distingue. Não eliminar duplicidades apenas pelo nome.
5. **Dados que faltam para a tabela `players`:** o pacote frequentemente não fornece posição, data de nascimento, overall, potencial, salário ou valor de mercado. Esses campos não devem receber valores apresentados como reais. Precisam ser preenchidos por fonte verificável ou por regras explicitamente marcadas como atributos de jogo.
6. **Categorias:** separar jogadores principais, U21/base e atletas apenas citados em estatísticas de gols. Não importar comissão técnica como jogador.
7. **Temporadas:** usar 2026 nas ligas de calendário civil. A K League 1 não deve ser rotulada como 2026/27; a Série C listada é para 2027 e não deve ser apresentada como elenco 2026.

## Estrutura do projeto e limite de conferência do banco

A migration versionada `supabase/migrations/20261110_seed_leagues.sql` é um cadastro inicial antigo de **20 ligas**. A migration `20261110_seed_ai_clubs.sql` declara criar **200 clubes (10 por divisão)**. Esses arquivos não refletem, por si só, a expansão posterior mencionada no histórico do projeto.

Não há nesta execução uma conexão de leitura ao banco Supabase para consultar as 39 ligas, seus IDs e a distribuição real de clubes. Portanto, **a comparação exata com o estado atual do banco continua pendente**. Não gerar comandos INSERT definitivos nem alterar o banco até receber uma extração somente de leitura das ligas e clubes atuais.

## Fontes do pacote

- [Relatório consolidado dos elencos 2026/27](https://github.com/edmarcoscaldas-hash/manager-futebol-online/blob/main/dados/elencos/QKeCjEBQnKVBREEc.md)
- [Eliminatórias FIFA 2026 e seleções](https://github.com/edmarcoscaldas-hash/manager-futebol-online/blob/main/dados/elencos/vUbdfkKhDqClWlPV.md)
- [Migration inicial de ligas](https://github.com/edmarcoscaldas-hash/manager-futebol-online/blob/main/supabase/migrations/20261110_seed_leagues.sql)
- [Migration inicial de clubes IA](https://github.com/edmarcoscaldas-hash/manager-futebol-online/blob/main/supabase/migrations/20261110_seed_ai_clubs.sql)

## Status

**Auditoria documental concluída; prévia de importação ainda não liberada.** A próxima etapa depende da leitura atual do cadastro Supabase e da validação nominal dos elencos que o pacote não conseguiu transcrever. Nenhuma alteração foi feita no banco.
