import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }
async function apiFootball(path: string, apiKey: string) {
  const response = await fetch(`https://v3.football.api-sports.io${path}`, { headers: { "x-apisports-key": apiKey } });
  const body = await response.json();
  if (!response.ok || (body.errors && Object.keys(body.errors).length)) throw new Error(JSON.stringify(body.errors ?? { status: response.status }));
  return body;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("API_FOOTBALL_KEY"), adminId = Deno.env.get("MFO_IMPORT_ADMIN_USER_ID");
    if (!url || !anon || !service) return json({ error: "supabase_environment_missing" }, 500);
    if (!adminId) return json({ error: "MFO_IMPORT_ADMIN_USER_ID_not_configured" }, 503);
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);
    const authClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.getUser();
    if (error || !data.user || data.user.id !== adminId) return json({ error: "not_authorized_for_import" }, 403);
    const body = await req.json(), action = body.action;
    if (!["list_leagues", "stage_league", "stage_squads", "stage_file_import", "list_staging", "set_review_status"].includes(action)) return json({ error: "invalid_action" }, 400);
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

    if (action === "list_staging") {
      const runId = body.run_id ? String(body.run_id) : null;
      const { data: staging, error: stagingError } = await db.rpc("mfo_list_import_staging", {
        p_run_id: runId,
        p_team_offset: Math.max(0, Number(body.team_offset) || 0),
        p_player_offset: Math.max(0, Number(body.player_offset) || 0),
        p_page_size: Math.min(100, Math.max(1, Number(body.page_size) || 50))
      });
      if (stagingError) throw stagingError;
      return json({ action, ...staging });
    }
    if (action === "set_review_status") {
      const entityType = String(body.entity_type ?? "");
      const recordId = Number(body.record_id);
      const reviewStatus = String(body.review_status ?? "");
      if (!["team", "player"].includes(entityType) || !Number.isSafeInteger(recordId) || recordId <= 0 ||
          !["new", "ignored", "conflict", "matched"].includes(reviewStatus)) {
        return json({ error: "invalid_review_update" }, 400);
      }
      const { data: updated, error: updateError } = await db.rpc("mfo_set_import_review_status", {
        p_entity_type: entityType, p_record_id: recordId, p_review_status: reviewStatus
      });
      if (updateError) throw updateError;
      return json({ action, ...updated });
    }
    if (action === "stage_file_import") {
      const teamsInput = Array.isArray(body.teams) ? body.teams : [], playersInput = Array.isArray(body.players) ? body.players : [];
      if (teamsInput.length > 3000 || playersInput.length > 3000) return json({ error: "file_import_limit_exceeded", detail: "Limite por envio: 3.000 clubes/seleções e 3.000 jogadores." }, 413);
      const serialized = JSON.stringify({ teams: teamsInput, players: playersInput });
      if (new TextEncoder().encode(serialized).length > 3_500_000) return json({ error: "file_import_payload_too_large", detail: "O arquivo convertido ultrapassou 3,5 MB. Divida a planilha em arquivos menores." }, 413);
      const teams = teamsInput.map((item: any) => ({
        external_id: String(item.external_id ?? "").slice(0, 160), country: item.country ? String(item.country).slice(0, 100) : null,
        competition: item.competition ? String(item.competition).slice(0, 160) : null,
        team_name: String(item.team_name ?? "").trim().slice(0, 160),
        payload: { ...(item.payload && typeof item.payload === "object" ? item.payload : {}), source: "uploaded_file", file_name: String(body.file_name ?? "arquivo").slice(0, 180), source_name: String(body.source_name ?? "").slice(0, 120) }
      })).filter((item: any) => item.external_id && item.team_name);
      const players = playersInput.map((item: any) => ({
        external_player_id: String(item.external_player_id ?? "").slice(0, 160),
        external_team_id: String(item.external_team_id ?? "").slice(0, 160),
        player_name: String(item.player_name ?? "").trim().slice(0, 160),
        payload: { ...(item.payload && typeof item.payload === "object" ? item.payload : {}), source: "uploaded_file", file_name: String(body.file_name ?? "arquivo").slice(0, 180), source_name: String(body.source_name ?? "").slice(0, 120) }
      })).filter((item: any) => item.external_player_id && item.external_team_id && item.player_name);
      if (!teams.length && !players.length) return json({ error: "no_valid_records" }, 400);
      const staged = await db.rpc("mfo_stage_football_import", { p_provider: "manual_file", p_teams: teams, p_players: players });
      if (staged.error) throw staged.error;
      return json({ action, run_id: staged.data?.run_id, teams_staged: staged.data?.teams_added ?? 0, players_staged: staged.data?.players_added ?? 0,
        note: "Arquivo armazenado somente na área privada de revisão; nenhum dado ativo do jogo foi alterado." });
    }
    if (!apiKey) return json({ error: "API_FOOTBALL_KEY_not_configured" }, 503);
    if (action === "list_leagues") {
      const country = String(body.country ?? "").trim(), season = Number(body.season ?? 2026);
      if (!country || country.length > 80 || !Number.isInteger(season)) return json({ error: "country_and_valid_season_required" }, 400);
      const result = await apiFootball(`/leagues?country=${encodeURIComponent(country)}&season=${season}`, apiKey);
      return json({ action, country, season, results: result.results ?? 0, leagues: (result.response ?? []).map((item: any) => ({
        id: item.league?.id, name: item.league?.name, type: item.league?.type, country: item.country?.name,
        seasons: item.seasons?.map((s: any) => ({ year: s.year, current: s.current, coverage: s.coverage })),
      })) });
    }
    if (action === "stage_league") {
      const leagueId = Number(body.league_id), season = Number(body.season ?? 2026);
      if (!Number.isInteger(leagueId) || leagueId <= 0 || !Number.isInteger(season)) return json({ error: "valid_league_id_and_season_required" }, 400);
      const result = await apiFootball(`/teams?league=${leagueId}&season=${season}`, apiKey), entries = result.response ?? [];
      const teams = entries.map((item: any) => ({ external_id: String(item.team?.id), country: item.team?.country ?? item.league?.country ?? null,
        competition: item.league?.name ?? String(leagueId), team_name: item.team?.name ?? "(sem nome)", payload: item })).filter((t: any) => t.external_id !== "undefined");
      const staged = await db.rpc("mfo_stage_football_import", { p_provider: "api_football", p_teams: teams, p_players: [], p_run_id: body.run_id ?? null });
      if (staged.error) throw staged.error;
      return json({ action, league_id: leagueId, season, api_results: result.results ?? entries.length,
        teams: teams.map((t: any) => ({ id: t.external_id, name: t.team_name, country: t.country, competition: t.competition })),
        staging: staged.data, next_step: "Use staging.run_id when calling stage_squads; send team IDs in batches of up to 10." });
    }
    const teamIds = Array.isArray(body.team_ids) ? body.team_ids.map((id: any) => String(id)).filter((id: string) => /^\d+$/.test(id)).slice(0, 10) : [];
    if (!teamIds.length) return json({ error: "team_ids_required_max_10" }, 400);
    const players: any[] = [], teamErrors: any[] = [];
    for (const teamId of teamIds) {
      try {
        const result = await apiFootball(`/players/squads?team=${teamId}`, apiKey);
        for (const player of ((result.response ?? [])[0]?.players ?? [])) if (player?.id) players.push({
          external_player_id: String(player.id), external_team_id: teamId, player_name: player.name ?? "(sem nome)", payload: player,
        });
      } catch (e) { teamErrors.push({ team_id: teamId, error: String(e) }); }
    }
    const staged = await db.rpc("mfo_stage_football_import", { p_provider: "api_football", p_teams: [], p_players: players, p_run_id: body.run_id ?? null });
    if (staged.error) throw staged.error;
    return json({ action, run_id: staged.data?.run_id, teams_requested: teamIds.length, players_found: players.length, team_errors: teamErrors,
      staging: staged.data, note: "Somente prévia privada; nenhum elenco ativo foi alterado." });
  } catch (e) { return json({ error: "import_request_failed", detail: String(e) }, 500); }
});
