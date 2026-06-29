# BioMetRx MCP

Claude.ai (and any MCP client) connection for BioMetRx health data. Mirrors the
OpenBrain/Lumotic pattern: a Supabase Edge Function (`biometrx-mcp`) running Hono +
`@modelcontextprotocol/sdk`, fronted by a thin Vercel proxy for clean OAuth URLs.

## Architecture

```
Claude.ai
   │  https://biometrx-mcp.vercel.app  (this Vercel project — proxy only)
   ▼
Vercel rewrite  ──►  https://cddemocpvsvxjlxszgdw.supabase.co/functions/v1/biometrx-mcp
   │
   ├─ /.well-known/oauth-authorization-server   discovery
   ├─ /.well-known/oauth-protected-resource     discovery
   ├─ /oauth/register | /authorize | /token     PKCE OAuth (DCR, no secret)
   └─ (catch-all)                               MCP JSON-RPC (Bearer auth)

Consent UI:  https://<biometrx-app>/oauth/authorize   (React route in the app)
Auth model:  user creates a bx_ key → PKCE exchange → opaque bearer token
```

## Tools

- **Readings** — `get_latest_reading`, `list_readings`, `get_bp_average`, `log_reading`
- **Nutrition** — `add_nutrition` (adds calories/macros to the day's running total — never replaces), `get_nutrition`
- **Bloods** — `get_latest_blood_panel`, `list_blood_panels`, `log_blood_panel`
- **Workouts** — `list_workouts`
- **Score** — `get_biometrx_age`, `get_insights`

## Deploy

### 1. Database
Apply `supabase/migrations/create_mcp_oauth_tables.sql` (creates `mcp_keys`,
`oauth_codes`, `oauth_tokens`).

### 2. Edge function
Deploy `supabase/functions/biometrx-mcp` with **JWT verification OFF** (Claude's
bearer token is not a Supabase JWT, so the platform gateway must not reject it):

```bash
supabase functions deploy biometrx-mcp --no-verify-jwt
```

Set these function secrets (Supabase → Edge Functions → Secrets):

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | https://cddemocpvsvxjlxszgdw.supabase.co |
| `SUPABASE_SERVICE_ROLE_KEY` | (service role key) |
| `BIOMETRX_MCP_BASE_URL` | https://biometrx-mcp.vercel.app (the proxy URL) |
| `BIOMETRX_UI_URL` | https://<biometrx-app> (where the consent page lives) |

> `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
> platform; set the two `BIOMETRX_*` vars manually.

### 3. Vercel proxy
Deploy this `mcp/` folder as its own Vercel project so it gets the domain
`biometrx-mcp.vercel.app` (matching `BIOMETRX_MCP_BASE_URL`). No build step — it is
rewrites only.

### 4. Main app
Set `VITE_BIOMETRX_MCP_URL=https://biometrx-mcp.vercel.app` in the BioMetRx app's
Vercel env so the `/oauth/authorize` consent page posts to the right server, then
redeploy the app.

## Issue a key for a user

```sql
-- 1. Generate a key client-side, e.g.  bx_<32+ random hex chars>
-- 2. Store ONLY its SHA-256 hash:
insert into public.mcp_keys (user_id, key_hash, label)
values ('<auth-user-uuid>', encode(digest('bx_xxxxxxxx', 'sha256'), 'hex'), 'Claude');
```

Give the plaintext `bx_…` key to the user. In Claude.ai → Settings → Connectors →
add `https://biometrx-mcp.vercel.app`, complete the OAuth flow, and paste the key on
the consent screen.
