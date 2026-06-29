import type { Context } from "hono";
import { BIOMETRX_MCP_BASE_URL } from "../lib/config.ts";

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Dynamic Client Registration (RFC 7591). Stateless, no secret — PKCE only.
export async function handleRegister(c: Context) {
  if (c.req.method === "OPTIONS") return c.text("", 204, CORS);
  if (c.req.method !== "POST") return c.json({ error: "method_not_allowed" }, 405, CORS);

  const body = await c.req.json().catch(() => ({}));

  const clientId = `biometrx-${randomHex(4)}`;

  return c.json(
    {
      client_id: clientId,
      client_secret: "",
      client_name: body.client_name ?? "BioMetRx Client",
      redirect_uris: body.redirect_uris ?? [],
      grant_types: ["authorization_code"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      registration_client_uri: `${BIOMETRX_MCP_BASE_URL}/oauth/register`,
    },
    201,
    CORS,
  );
}
