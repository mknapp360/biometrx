-- OAuth / MCP auth tables for BioMetRx.
-- Mirrors the OpenBrain/Lumotic pattern: a long-lived per-user key (bx_*),
-- single-use PKCE authorization codes, and opaque bearer tokens.

-- mcp_keys: one row per user, stores the SHA-256 hash of their bx_ key.
-- Plaintext is NEVER stored — it is typed once on the consent page, then gone.
CREATE TABLE IF NOT EXISTS public.mcp_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash     text NOT NULL UNIQUE,
  label        text,
  created_at   timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- oauth_codes: single-use, PKCE-bound authorization codes (5-minute TTL).
CREATE TABLE IF NOT EXISTS public.oauth_codes (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL UNIQUE,
  mcp_key_id            uuid NOT NULL REFERENCES public.mcp_keys(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL,
  code_challenge        text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  redirect_uri          text NOT NULL,
  expires_at            timestamptz NOT NULL,
  used_at               timestamptz
);

CREATE INDEX IF NOT EXISTS idx_oauth_codes_code ON public.oauth_codes (code) WHERE used_at IS NULL;

-- oauth_tokens: opaque bearer tokens minted at token exchange.
-- The mcp key never travels after the moment the user types it.
-- Revoke individual sessions by setting revoked_at without touching the key.
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash    text NOT NULL UNIQUE,
  mcp_key_id    uuid NOT NULL REFERENCES public.mcp_keys(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  created_at    timestamptz DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_hash ON public.oauth_tokens (token_hash) WHERE revoked_at IS NULL;

-- These tables are only ever accessed by the edge function via the service-role
-- key (which bypasses RLS). Enable RLS with no policies so they are sealed off
-- from the anon/auth client used by the browser app.
ALTER TABLE public.mcp_keys     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
