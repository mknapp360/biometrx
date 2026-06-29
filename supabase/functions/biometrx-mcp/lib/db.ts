// Single choke point for all user-scoped database access.
// - from(): scoped reads/updates/deletes — user_id filter applied automatically
// - insert(): scoped writes — user_id stamped into every row before insert
// - getUserMetadata(): the authenticated user's auth metadata (name, DOB, units…)

import { supabase } from "./supabase.ts";

export function scopedDb(userId: string) {
  const from = (
    table: string,
    columns = "*",
    opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean },
  ) => supabase.from(table).select(columns, opts).eq("user_id", userId);

  const insert = (
    table: string,
    payload: Record<string, unknown> | Record<string, unknown>[],
  ) => {
    const stamp = (row: Record<string, unknown>) => ({ ...row, user_id: userId });
    const rows = Array.isArray(payload) ? payload.map(stamp) : stamp(payload);
    return supabase.from(table).insert(rows);
  };

  const update = (table: string, patch: Record<string, unknown>) =>
    supabase.from(table).update(patch).eq("user_id", userId);

  const getUserMetadata = async (): Promise<Record<string, unknown>> => {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  };

  return { from, insert, update, getUserMetadata, userId };
}

export type ScopedDb = ReturnType<typeof scopedDb>;
