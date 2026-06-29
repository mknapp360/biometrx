import type { Context } from "hono";
import { BIOMETRX_UI_URL } from "../lib/config.ts";
import { resolveMcpKey } from "../lib/auth.ts";
import { supabase } from "../lib/supabase.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function handleAuthorize(c: Context) {
  if (c.req.method === "OPTIONS") return c.text("", 204, CORS);

  if (c.req.method === "GET") {
    // Redirect to the BioMetRx consent UI, forwarding OAuth params.
    const url = new URL(c.req.url);
    const params = new URLSearchParams({
      redirect_uri: url.searchParams.get("redirect_uri") ?? "",
      state: url.searchParams.get("state") ?? "",
      code_challenge: url.searchParams.get("code_challenge") ?? "",
      code_challenge_method: url.searchParams.get("code_challenge_method") ?? "S256",
      client_id: url.searchParams.get("client_id") ?? "",
    });
    return c.redirect(`${BIOMETRX_UI_URL}/oauth/authorize?${params}`, 302);
  }

  if (c.req.method !== "POST") return c.json({ error: "method_not_allowed" }, 405, CORS);

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ error: "invalid_request", error_description: "JSON body required" }, 400, CORS);
  }

  const { mcp_key, redirect_uri, state, code_challenge, code_challenge_method } = body;

  if (!mcp_key || !redirect_uri || !code_challenge) {
    return c.json(
      {
        error: "invalid_request",
        error_description: "mcp_key, redirect_uri and code_challenge are required",
      },
      400,
      CORS,
    );
  }

  if (code_challenge_method && code_challenge_method !== "S256") {
    return c.json(
      { error: "invalid_request", error_description: "Only S256 code_challenge_method is supported" },
      400,
      CORS,
    );
  }

  const identity = await resolveMcpKey(mcp_key);
  if (!identity) {
    return c.json({ error: "access_denied", error_description: "Invalid key" }, 401, CORS);
  }

  const code = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const { error } = await supabase.from("oauth_codes").insert({
    code,
    mcp_key_id: identity.keyId,
    user_id: identity.userId,
    code_challenge,
    code_challenge_method: code_challenge_method ?? "S256",
    redirect_uri,
    expires_at: expiresAt,
  });

  if (error) {
    return c.json({ error: "server_error", error_description: error.message }, 500, CORS);
  }

  const callbackUrl = new URL(redirect_uri);
  callbackUrl.searchParams.set("code", code);
  if (state) callbackUrl.searchParams.set("state", state);

  return c.json({ redirect_url: callbackUrl.toString() }, 200, CORS);
}
