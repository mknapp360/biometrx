// Shared environment + configuration constants for biometrx-mcp.
// Single source of truth for env vars.

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Public URL of this MCP server — the Vercel proxy that rewrites to this Edge
// Function. Used to build OAuth metadata endpoints. e.g. https://biometrx-mcp.vercel.app
export const BIOMETRX_MCP_BASE_URL = Deno.env.get("BIOMETRX_MCP_BASE_URL") ?? "";

// Public URL of the BioMetRx app — where GET /oauth/authorize redirects users
// to type their bx_ key. e.g. https://biometrx.vercel.app
export const BIOMETRX_UI_URL = Deno.env.get("BIOMETRX_UI_URL") ?? "";
