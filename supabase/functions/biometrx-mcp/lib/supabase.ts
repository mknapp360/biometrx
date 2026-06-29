// Shared Supabase client (service-role) for biometrx-mcp.
// Service role bypasses RLS — every tool enforces user scoping itself via db.ts.

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./config.ts";

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
