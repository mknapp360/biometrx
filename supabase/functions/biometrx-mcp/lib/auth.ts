import { supabase } from "./supabase.ts";

export async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sha256base64url(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return base64urlEncode(buf);
}

/** Validate a bx_ key against the mcp_keys table. Used only at /oauth/authorize. */
export async function resolveMcpKey(
  raw: string,
): Promise<{ userId: string; keyId: string } | null> {
  if (!raw.startsWith("bx_")) return null;
  const hash = await sha256hex(raw);
  const { data } = await supabase
    .from("mcp_keys")
    .select("id, user_id")
    .eq("key_hash", hash)
    .single();
  if (!data) return null;
  supabase
    .from("mcp_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});
  return { userId: data.user_id, keyId: data.id };
}

/** Mint an opaque bearer token at /oauth/token. The bx_ key never travels after this. */
export async function mintBearerToken(
  mcpKeyId: string,
  userId: string,
): Promise<string> {
  const opaque = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const hash = await sha256hex(opaque);
  const { error } = await supabase.from("oauth_tokens").insert({
    token_hash: hash,
    mcp_key_id: mcpKeyId,
    user_id: userId,
  });
  if (error) throw new Error(`Failed to store token: ${error.message}`);
  return opaque;
}

/** Resolve an opaque bearer token to a userId. Used on every MCP call. */
export async function resolveBearerToken(
  token: string,
): Promise<{ userId: string } | null> {
  const hash = await sha256hex(token);
  const { data } = await supabase
    .from("oauth_tokens")
    .select("user_id")
    .eq("token_hash", hash)
    .is("revoked_at", null)
    .single();
  if (!data) return null;
  supabase
    .from("oauth_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("token_hash", hash)
    .then(() => {});
  return { userId: data.user_id };
}
