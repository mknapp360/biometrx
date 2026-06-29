import type { Context } from "hono";
import { BIOMETRX_MCP_BASE_URL } from "../lib/config.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export function handleAuthServerMeta(c: Context) {
  if (c.req.method === "OPTIONS") return c.text("", 204, { "Access-Control-Allow-Origin": "*" });
  return c.json(
    {
      issuer: BIOMETRX_MCP_BASE_URL,
      authorization_endpoint: `${BIOMETRX_MCP_BASE_URL}/oauth/authorize`,
      token_endpoint: `${BIOMETRX_MCP_BASE_URL}/oauth/token`,
      registration_endpoint: `${BIOMETRX_MCP_BASE_URL}/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
    },
    200,
    CORS,
  );
}
