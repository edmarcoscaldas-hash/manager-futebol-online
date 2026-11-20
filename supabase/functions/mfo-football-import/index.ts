import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("API_FOOTBALL_KEY");
    const adminUserId = Deno.env.get("MFO_IMPORT_ADMIN_USER_ID");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "supabase_environment_missing" }, 500);
    if (!apiKey) return json({ error: "API_FOOTBALL_KEY_not_configured" }, 503);
    if (!adminUserId) return json({ error: "MFO_IMPORT_ADMIN_USER_ID_not_configured" }, 503);
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user || userData.user.id !== adminUserId) return json({ error: "not_authorized_for_import" }, 403);
    const body = await req.json();
    const action = body.action;
    if (!["list_leagues", "stage_league", "stage_squads"].includes(action)) return json({ error: "invalid_action" }, 400);
    if (action === "list_leagues") {
      const country = String(body.country ?? "").trim();
      const season = Number(body.season ?? 2026);
      if (!country || country.length > 80 || !Number.isInteger(season)) return json({ error: "country_and_valid_season_required" }, 400);
      const result = await apiFootball(`/leagues?country=${encodeURIComponent(country)}&season=${season}`, apiKey);
      return json({ action, country, season, results: result.results ?? 0, leagues: (result.response ?? []).map((item: any) => ({
        id: item.league?.id, name: item.league?.name, type: item.league?.type, country: item.country?.name,
        seasons: item.seasons?.map((s: any) => ({ year: s.year, current: s.current, coverage: s.coverage })),
      })) });
    }
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    if (action === "stage_league") {
      const leagueId = Number(body.league_id), season = Number(body.season ?? 2026);
      if (!Number.isInteger(leagueId) || leagueId <= 0 || !Number.isInteger(season)) return json({ error: "valid_league_id_and_season_required" }, 400);
      const result = await apiFootball(`/teams?league=${leagueId}&season=${season}`, apiKey);
      const entries = result.response ?? [];
      const teams = entries.map((item: any) => ({
        external_id: String(item.team?.id), country: item.team?.country ?? item.league?.country ?? null,
        competition: item.league?.name ?? String(leagueId), team_name: item.team?.name ?? "(sem nome)", payload: item,
      })).filter((item: any) => item.external_id !== "undefined");
      const staged = await serviceClient.rpc("mfo_stage_football_import", { p_provider: "api_football", p_teams: teams, p_players: [] });
      if (staged.error) throw staged.error;
      return json({ action, league_id: leagueId, season, api_results: result.results ?? entries.length,
        teams: teams.map((t: any) => ({ id: t.external_id, name: t.team_name, country: t.country, competition: t.competition })),
        staging: staged.data, next_step: "Call stage_squads with returned team IDs in batches of up to 10." });
    }
    const teamIds = Array.isArray(body.team_ids) ? body.team_ids.map((id: any) => String(id)).filter((id: string) => /^\d+$/.test(id)).slice(0, 10) : [];
    if (!teamIds.length) return json({ error: "team_ids_required_max_10" }, 400);
    const players: any[] = [], teamErrors: any[] = [];
    for (const teamId of teamIds) {
      try {
        const squad = await apiFootball(`/players/squads?team=${teamId}`, apiKey);
        for (const player of ((squad.response ?? [])[0]?.players ?? [])) if (player?.id) players.push({
          external_player_id: String(player.id), external_team_id: teamId, player_name: player.name ?? "(sem nome)", payload: player,
        });
      } catch (error) { teamErrors.push({ team_id: teamId, error: String(error) }); }
    }
    const staged = await serviceClient.rpc("mfo_stage_football_import", { p_provider: "api_football", p_teams: [], p_players: players });
    if (staged.error) throw staged.error;
    return json({ action, teams_requested: teamIds.length, players_found: players.length, team_errors: teamErrors,
      staging: staged.data, note: "Somente prévia privada; nenhum elenco ativo foi alterado." });
  } catch (error) { return json({ error: "import_request_failed", detail: String(error) }, 500); }
});
