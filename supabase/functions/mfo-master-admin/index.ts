import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const masterId = Deno.env.get("MFO_IMPORT_ADMIN_USER_ID");
    if (!url || !anon || !service || !masterId) return json({ error: "master_admin_not_configured" }, 503);

    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);
    const authClient = createClient(url, anon, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user || authData.user.id !== masterId) return json({ error: "master_access_required" }, 403);

    const adminId = authData.user.id;
    const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const body = await req.json();
    const action = String(body.action ?? "");

    if (action === "list_users") {
      const { data: usersData, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      const users = usersData.users.filter((u) => !u.deleted_at);
      const ids = users.map((u) => u.id);
      const [profilesRes, clubsRes, careersRes] = await Promise.all([
        db.from("profiles").select("id,nome,email,created_at").in("id", ids),
        db.from("clubs").select("id,owner_id,nome,created_at").in("owner_id", ids),
        db.from("manager_careers").select("id,user_id,status,created_at").in("user_id", ids),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (clubsRes.error) throw clubsRes.error;
      if (careersRes.error) throw careersRes.error;
      const profiles = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
      const clubCounts = new Map<string, number>();
      const careerCounts = new Map<string, number>();
      for (const c of clubsRes.data ?? []) clubCounts.set(c.owner_id, (clubCounts.get(c.owner_id) ?? 0) + 1);
      for (const c of careersRes.data ?? []) careerCounts.set(c.user_id, (careerCounts.get(c.user_id) ?? 0) + 1);
      const rows = users.map((u) => {
        const p = profiles.get(u.id);
        return {
          id: u.id,
          email: u.email ?? p?.email ?? "",
          nome: p?.nome ?? u.user_metadata?.nome ?? "",
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          banned_until: u.banned_until,
          blocked: Boolean(u.banned_until && new Date(u.banned_until).getTime() > Date.now()),
          clubs_count: clubCounts.get(u.id) ?? 0,
          careers_count: careerCounts.get(u.id) ?? 0,
          is_master: u.id === masterId,
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return json({ action, total_users: rows.length, blocked_users: rows.filter((u) => u.blocked).length, users: rows });
    }

    const targetId = String(body.target_user_id ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetId)) {
      return json({ error: "valid_target_user_id_required" }, 400);
    }
    if (targetId === masterId) return json({ error: "master_account_protected" }, 403);

    if (action === "block_user" || action === "unblock_user") {
      const ban_duration = action === "block_user" ? "876000h" : "none";
      const { data, error } = await db.auth.admin.updateUserById(targetId, { ban_duration });
      if (error) throw error;
      await db.from("mfo_admin_audit").insert({
        admin_user_id: adminId, target_user_id: targetId,
        action: action === "block_user" ? "block_user" : "unblock_user",
        details: { email: data.user?.email ?? null },
      });
      return json({ success: true, action, target_user_id: targetId, blocked: action === "block_user" });
    }

    if (action === "reset_complete_individual") {
      if (body.confirm_reset !== true) return json({ error: "explicit_reset_confirmation_required" }, 400);
      const { data, error } = await db.rpc("mfo_admin_reset_user_game_data", { p_target_user_id: targetId, p_admin_user_id: adminId });
      if (error) throw error;
      return json({ success: true, action, result: data });
    }

    return json({ error: "invalid_action" }, 400);
  } catch (error) {
    return json({ error: "master_admin_request_failed", detail: String(error) }, 500);
  }
});
