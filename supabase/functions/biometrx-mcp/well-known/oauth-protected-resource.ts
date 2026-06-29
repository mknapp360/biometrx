import type { Context } from "hono";
import { BIOMETRX_MCP_BASE_URL } from "../lib/config.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export function handleProtectedResourceMeta(c: Context) {
  if (c.req.method === "OPTIONS") return c.text("", 204, { "Access-Control-Allow-Origin": "*" });
  return c.json(
    {
      resource: BIOMETRX_MCP_BASE_URL,
      authorization_servers: [BIOMETRX_MCP_BASE_URL],
      scopes_supported: ["biometrx:read", "biometrx:write"],
      bearer_methods_supported: ["header"],
    },
    200,
    CORS,
  );
}
