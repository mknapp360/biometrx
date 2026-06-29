import type { Context } from "hono";
import { sha256base64url, mintBearerToken } from "../lib/auth.ts";
import { supabase } from "../lib/supabase.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

export async function handleToken(c: Context) {
  if (c.req.method === "OPTIONS") return c.text("", 204, CORS);
  if (c.req.method !== "POST") return c.json({ error: "method_not_allowed" }, 405, CORS);

  // Accept both JSON and application/x-www-form-urlencoded
  let grant_type: string | undefined;
  let code: string | undefined;
  let code_verifier: string | undefined;

  const ct = c.req.header("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await c.req.text();
    const params = new URLSearchParams(text);
    grant_type = params.get("grant_type") ?? undefined;
    code = params.get("code") ?? undefined;
    code_verifier = params.get("code_verifier") ?? undefined;
  } else {
    const body = await c.req.json().catch(() => ({}));
    grant_type = body.grant_type;
    code = body.code;
    code_verifier = body.code_verifier;
  }

  if (grant_type !== "authorization_code") {
    return c.json({ error: "unsupported_grant_type" }, 400, CORS);
  }
  if (!code || !code_verifier) {
    return c.json(
      { error: "invalid_request", error_description: "code and code_verifier are required" },
      400,
      CORS,
    );
  }

  // Look up the code — must be unused and not expired
  const { data: codeRow } = await supabase
    .from("oauth_codes")
    .select("id, mcp_key_id, user_id, code_challenge, code_challenge_method, expires_at, used_at")
    .eq("code", code)
    .single();

  if (!codeRow || codeRow.used_at) {
    return c.json({ error: "invalid_grant", error_description: "Code not found or already used" }, 400, CORS);
  }

  if (new Date(codeRow.expires_at) < new Date()) {
    return c.json({ error: "invalid_grant", error_description: "Code expired" }, 400, CORS);
  }

  // Verify PKCE: SHA-256(code_verifier) base64url must equal stored code_challenge
  const computed = await sha256base64url(code_verifier);
  if (computed !== codeRow.code_challenge) {
    return c.json({ error: "invalid_grant", error_description: "code_verifier mismatch" }, 400, CORS);
  }

  // Mark code used atomically — if another request beat us here, used_at is already set
  const { data: updated } = await supabase
    .from("oauth_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("id", codeRow.id)
    .is("used_at", null)
    .select("id");

  if (!updated?.length) {
    return c.json({ error: "invalid_grant", error_description: "Code already used" }, 400, CORS);
  }

  // Mint opaque bearer token — the bx_ key never appears again after this
  const accessToken = await mintBearerToken(codeRow.mcp_key_id, codeRow.user_id);

  return c.json(
    {
      access_token: accessToken,
      token_type: "bearer",
      expires_in: 31536000,
    },
    200,
    CORS,
  );
}
