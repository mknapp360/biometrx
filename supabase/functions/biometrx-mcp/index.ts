import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { BIOMETRX_MCP_BASE_URL } from "./lib/config.ts";
import { resolveBearerToken } from "./lib/auth.ts";
import { scopedDb } from "./lib/db.ts";
import { handleAuthServerMeta } from "./well-known/oauth-authorization-server.ts";
import { handleProtectedResourceMeta } from "./well-known/oauth-protected-resource.ts";
import { handleRegister } from "./oauth/register.ts";
import { handleAuthorize } from "./oauth/authorize.ts";
import { handleToken } from "./oauth/token.ts";
import { registerReadingTools } from "./tools/readings.ts";
import { registerBloodTools } from "./tools/bloods.ts";
import { registerWorkoutTools } from "./tools/workouts.ts";
import { registerScoreTools } from "./tools/score.ts";

const app = new Hono();

// Global CORS — required for browser-initiated requests (OAuth consent UI).
// Must come before route registration so OPTIONS preflights are handled
// before any auth check runs.
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// ChatGPT probes for OpenID Connect — return 404 so it falls back to OAuth 2.0.
app.get("/biometrx-mcp/.well-known/openid-configuration", (c) =>
  c.json({ error: "not_supported" }, 404)
);

// OAuth discovery + endpoints. Routes are prefixed with the Supabase function
// name so they resolve both directly and behind the Vercel proxy.
for (const p of ["/biometrx-mcp"]) {
  app.get(`${p}/.well-known/oauth-authorization-server`, handleAuthServerMeta);
  app.get(`${p}/.well-known/oauth-protected-resource`, handleProtectedResourceMeta);
  app.options(`${p}/.well-known/oauth-authorization-server`, handleAuthServerMeta);
  app.options(`${p}/.well-known/oauth-protected-resource`, handleProtectedResourceMeta);
  app.all(`${p}/oauth/register`, handleRegister);
  app.all(`${p}/oauth/authorize`, handleAuthorize);
  app.all(`${p}/oauth/token`, handleToken);
}

// --- MCP endpoint (Bearer auth required) ---
// Catches everything not matched above. Auth lives in the Authorization header —
// the body is untouched so the transport reads it exactly once.
app.all("*", async (c) => {
  const authHeader = c.req.header("authorization") ?? "";
  const raw = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  const unauthorized = () =>
    c.json(
      { error: "Unauthorized" },
      401,
      {
        "WWW-Authenticate":
          `Bearer resource_metadata="${BIOMETRX_MCP_BASE_URL}/.well-known/oauth-protected-resource"`,
      },
    );

  if (!raw) return unauthorized();

  const identity = await resolveBearerToken(raw);
  if (!identity) return unauthorized();

  // Per-request McpServer scoped to the authenticated user.
  const server = new McpServer({ name: "biometrx", version: "1.0.0" });
  const db = scopedDb(identity.userId);

  registerReadingTools(server, db);
  registerBloodTools(server, db);
  registerWorkoutTools(server, db);
  registerScoreTools(server, db);

  const transport = new StreamableHTTPTransport();
  await server.connect(transport);
  return transport.handleRequest(c);
});

Deno.serve(app.fetch);
