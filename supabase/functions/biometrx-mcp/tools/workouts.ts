// Workout tools: read logged workout sessions.
// Table: public.workout_sessions (synced from Health Connect / logged)

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScopedDb } from "../lib/db.ts";
import { jsonResult, errorResult } from "./_helpers.ts";

const WORKOUT_COLUMNS =
  "id, workout_date, start_time, end_time, duration_min, workout_type, biometrx_category, " +
  "distance_m, calories_burned, avg_heart_rate, max_heart_rate, source_app, notes";

export function registerWorkoutTools(server: McpServer, db: ScopedDb) {
  server.registerTool(
    "list_workouts",
    {
      title: "List Workouts",
      description:
        "List recent workout sessions, most recent first. Includes type, BioMetRx category, " +
        "duration, distance, calories and heart-rate data. Optionally filter by days back.",
      inputSchema: {
        days: z.number().int().positive().optional()
          .describe("Only return workouts from the last N days."),
        limit: z.number().int().positive().max(200).optional().default(30)
          .describe("Maximum number of workouts to return (default 30)."),
      },
    },
    async ({ days, limit }) => {
      let q = db
        .from("workout_sessions", WORKOUT_COLUMNS)
        .order("start_time", { ascending: false })
        .limit(limit ?? 30);
      if (days) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        q = q.gte("start_time", cutoff);
      }
      const { data, error } = await q;
      if (error) return errorResult(`Error: ${error.message}`);
      return jsonResult({ count: data?.length ?? 0, workouts: data ?? [] });
    },
  );
}
