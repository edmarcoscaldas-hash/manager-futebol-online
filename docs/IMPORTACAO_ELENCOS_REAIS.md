# Importação de clubes e elencos reais

A Edge Function `mfo-football-import` consulta a API-Football e grava respostas somente nas tabelas privadas de staging. Nenhum registro ativo de `clubs` ou `players` é atualizado por esta função.

## Secrets necessários no Supabase
Configure em **Project Settings → Edge Functions → Secrets**:
- `API_FOOTBALL_KEY`: chave da conta API-Football.
- `MFO_IMPORT_ADMIN_USER_ID`: UUID do usuário autorizado a operar a importação.

As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são fornecidas pelo ambiente Supabase. Nunca exponha a service role key no frontend.

## Operações (POST autenticado)
- `{"action":"list_leagues","country":"Brazil","season":2026}`
- `{"action":"stage_league","league_id":71,"season":2026}` (o ID é ilustrativo; consulte list_leagues primeiro)
- `{"action":"stage_squads","team_ids":["127","128"]}` (máximo 10 times por chamada)

Use o JWT do usuário administrativo no header Authorization. Os resultados ficam em `private.football_import_runs`, `private.football_import_teams` e `private.football_import_players`. A função SQL `mfo_stage_football_import` só pode ser executada pelo service_role.
