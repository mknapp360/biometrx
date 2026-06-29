// Nutrition tools: add to / read TODAY'S running macro total.
// Mirrors the app (AddReading.tsx): BioMetRx keeps one health_readings row per
// day and accumulates nutrition into it, so add_nutrition finds the day's row
// and ADDS to the existing values (never replaces). Covers every macro on the
// Add screen: calories, protein, fat, carbs, sugar, fibre, refined starch,
// alcohol units, plus the daily ultra-processed score (0-3, set not summed).

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScopedDb } from "../lib/db.ts";
import { jsonResult, errorResult } from "./_helpers.ts";

// Accumulated macro fields, grouped by rounding.
const INT_FIELDS = ["calories"] as const;
const DEC_FIELDS = [
  "protein_g", "fat_g", "carbs_g", "sugar_g", "fibre_g", "refined_starch_g", "alcohol_units",
] as const;
const ADD_FIELDS = [...INT_FIELDS, ...DEC_FIELDS] as const;

const SELECT_COLS =
  `id, recorded_at, notes, ultra_processed_score, ${ADD_FIELDS.join(", ")}`;

// Calendar date (YYYY-MM-DD) in Martin's local timezone, matching the app's
// device-local "today" logic. Europe/London handles GMT/BST automatically.
function localDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function dailyTotals(data: Record<string, unknown> | null) {
  if (!data) return {};
  const out: Record<string, unknown> = {};
  for (const f of ADD_FIELDS) out[f] = data[f] ?? 0;
  out.ultra_processed_score = data.ultra_processed_score ?? null;
  return out;
}

async function findDayRow(db: ScopedDb, targetDate: string) {
  const { data, error } = await db
    .from("health_readings", SELECT_COLS)
    .order("recorded_at", { ascending: false })
    .limit(60);
  if (error) return { error };
  const row = (data ?? []).find(
    (r: { recorded_at: string }) => localDate(new Date(r.recorded_at)) === targetDate,
  ) as Record<string, unknown> | undefined;
  return { row };
}

export function registerNutritionTools(server: McpServer, db: ScopedDb) {
  // --- add_nutrition (write, additive) ---
  server.registerTool(
    "add_nutrition",
    {
      title: "Add Calories & Macros",
      description:
        "Add calories and macros to the running total for a day (defaults to today). " +
        "Calorie and gram values are ADDED to whatever is already logged for that day — they " +
        "never replace it — so call this once per food/meal as you eat. BioMetRx keeps one entry " +
        "per day and accumulates into it. If you only know what was eaten, estimate the calories " +
        "and macros first, then pass the numbers here. ultra_processed_score is a 0-3 rating for " +
        "the whole day and is SET (replaced), not added. Provide at least one value.",
      inputSchema: {
        calories: z.number().int().optional().describe("Calories to add (kcal)."),
        protein_g: z.number().optional().describe("Protein to add (g)."),
        fat_g: z.number().optional().describe("Fat to add (g)."),
        carbs_g: z.number().optional().describe("Carbohydrate to add (g)."),
        sugar_g: z.number().optional().describe("Sugar to add (g)."),
        fibre_g: z.number().optional().describe("Fibre to add (g)."),
        refined_starch_g: z.number().optional().describe("Refined starch to add (g)."),
        alcohol_units: z.number().optional().describe("Alcohol units to add."),
        ultra_processed_score: z.number().int().min(0).max(3).optional()
          .describe("Ultra-processed food level for the day: 0 none, 1 a little, 2 some, 3 a lot. Replaces the day's value."),
        food: z.string().optional()
          .describe("Optional description of what was eaten, appended to the day's notes."),
        date: z.string().optional()
          .describe("Target day as YYYY-MM-DD. Defaults to today (Europe/London)."),
      },
    },
    async (params) => {
      const { food, date, ultra_processed_score, ...rawAmounts } = params;

      const amounts: Record<string, number> = {};
      for (const f of ADD_FIELDS) {
        const v = (rawAmounts as Record<string, number | undefined>)[f];
        if (v !== undefined) amounts[f] = v;
      }
      if (Object.keys(amounts).length === 0 && ultra_processed_score === undefined) {
        return errorResult("Provide at least one of calories, a macro, or ultra_processed_score.");
      }

      const today = localDate(new Date());
      const targetDate = date ?? today;

      const { row: existing, error: fetchErr } = await findDayRow(db, targetDate);
      if (fetchErr) return errorResult(`Error: ${fetchErr.message}`);

      if (existing) {
        const patch: Record<string, unknown> = {};
        for (const f of INT_FIELDS) {
          if (f in amounts) patch[f] = Math.round(Number(existing[f] ?? 0) + amounts[f]);
        }
        for (const f of DEC_FIELDS) {
          if (f in amounts) patch[f] = round1(Number(existing[f] ?? 0) + amounts[f]);
        }
        if (ultra_processed_score !== undefined) patch.ultra_processed_score = ultra_processed_score;
        if (food) {
          const prev = (existing.notes as string | null) ?? "";
          patch.notes = prev ? `${prev}; ${food}` : food;
        }

        const { data, error } = await db
          .update("health_readings", patch)
          .eq("id", existing.id as string)
          .select(SELECT_COLS)
          .single();
        if (error) return errorResult(`Failed to update ${targetDate}'s nutrition: ${error.message}`);
        return jsonResult({
          message: `Added to ${targetDate}'s running total.`,
          date: targetDate,
          added: amounts,
          daily_totals: dailyTotals(data),
        });
      }

      // No row yet for the day — create one.
      const row: Record<string, unknown> = {};
      for (const f of INT_FIELDS) if (f in amounts) row[f] = Math.round(amounts[f]);
      for (const f of DEC_FIELDS) if (f in amounts) row[f] = round1(amounts[f]);
      if (ultra_processed_score !== undefined) row.ultra_processed_score = ultra_processed_score;
      if (food) row.notes = food;
      row.recorded_at = targetDate !== today ? `${targetDate}T12:00:00Z` : new Date().toISOString();

      const { data, error } = await db
        .insert("health_readings", row)
        .select(SELECT_COLS)
        .single();
      if (error) return errorResult(`Failed to log nutrition: ${error.message}`);
      return jsonResult({
        message: `Started ${targetDate}'s log with this entry.`,
        date: targetDate,
        added: amounts,
        daily_totals: dailyTotals(data),
      });
    },
  );

  // --- get_nutrition (read a day's totals) ---
  server.registerTool(
    "get_nutrition",
    {
      title: "Get Day's Nutrition",
      description:
        "Read the accumulated calories and macros for a day (defaults to today): calories, " +
        "protein, fat, carbs, sugar, fibre, refined starch, alcohol units and the " +
        "ultra-processed score. Use this to check what's been logged so far.",
      inputSchema: {
        date: z.string().optional()
          .describe("Day as YYYY-MM-DD. Defaults to today (Europe/London)."),
      },
    },
    async ({ date }) => {
      const targetDate = date ?? localDate(new Date());
      const { row, error } = await findDayRow(db, targetDate);
      if (error) return errorResult(`Error: ${error.message}`);
      if (!row) {
        return jsonResult({ date: targetDate, logged: false, message: "Nothing logged for this day yet." });
      }
      return jsonResult({
        date: targetDate,
        logged: true,
        notes: row.notes ?? null,
        daily_totals: dailyTotals(row),
      });
    },
  );
}
