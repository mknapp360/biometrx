// Health-reading tools: read latest/history + BP averages, and log new readings.
// Table: public.health_readings (BP, weight, glucose, nutrition, sleep, HRV, steps…)

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScopedDb } from "../lib/db.ts";
import {
  jsonResult,
  errorResult,
  calculateMAP,
  calculatePulsePressure,
} from "./_helpers.ts";

const READING_COLUMNS =
  "id, recorded_at, systolic, diastolic, pulse, map, pulse_pressure, weight_kg, waist_cm, " +
  "glucose_mmol, mounjaro_dose_mg, sleep_hours, sleep_deep_min, sleep_rem_min, hrv_ms, " +
  "steps, calories, protein_g, fat_g, carbs_g, sugar_g, fibre_g, alcohol_units, " +
  "vo2_max, notes";

export function registerReadingTools(server: McpServer, db: ScopedDb) {
  // --- get_latest_reading ---
  server.registerTool(
    "get_latest_reading",
    {
      title: "Get Latest Reading",
      description:
        "Get the most recent health reading: blood pressure, pulse, weight, waist, glucose, " +
        "sleep, HRV, steps and nutrition for the latest logged entry.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await db
        .from("health_readings", READING_COLUMNS)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return errorResult(`Error: ${error.message}`);
      if (!data) return jsonResult({ message: "No readings logged yet." });
      return jsonResult(data);
    },
  );

  // --- list_readings ---
  server.registerTool(
    "list_readings",
    {
      title: "List Readings",
      description:
        "List recent health readings, most recent first. Optionally filter by a number of " +
        "days back (e.g. last 30 days). Use this for trends and history.",
      inputSchema: {
        days: z.number().int().positive().optional()
          .describe("Only return readings from the last N days."),
        limit: z.number().int().positive().max(365).optional().default(30)
          .describe("Maximum number of readings to return (default 30)."),
      },
    },
    async ({ days, limit }) => {
      let q = db
        .from("health_readings", READING_COLUMNS)
        .order("recorded_at", { ascending: false })
        .limit(limit ?? 30);
      if (days) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();
        q = q.gte("recorded_at", cutoff);
      }
      const { data, error } = await q;
      if (error) return errorResult(`Error: ${error.message}`);
      return jsonResult({ count: data?.length ?? 0, readings: data ?? [] });
    },
  );

  // --- get_bp_average ---
  server.registerTool(
    "get_bp_average",
    {
      title: "Get Blood Pressure Average",
      description:
        "Average systolic/diastolic blood pressure over a window of days (default 7). " +
        "Returns the mean of all BP readings in that window plus the sample count.",
      inputSchema: {
        days: z.number().int().positive().optional().default(7)
          .describe("Window size in days (default 7)."),
      },
    },
    async ({ days }) => {
      const window = days ?? 7;
      const cutoff = new Date(Date.now() - window * 86400000).toISOString();
      const { data, error } = await db
        .from("health_readings", "systolic, diastolic, recorded_at")
        .gte("recorded_at", cutoff)
        .not("systolic", "is", null)
        .not("diastolic", "is", null);
      if (error) return errorResult(`Error: ${error.message}`);
      if (!data || data.length === 0) {
        return jsonResult({ window_days: window, sample_count: 0, message: "No BP readings in this window." });
      }
      const rows = data as { systolic: number; diastolic: number }[];
      const avgSys = Math.round(rows.reduce((s, r) => s + r.systolic, 0) / rows.length);
      const avgDia = Math.round(rows.reduce((s, r) => s + r.diastolic, 0) / rows.length);
      return jsonResult({
        window_days: window,
        sample_count: rows.length,
        average_systolic: avgSys,
        average_diastolic: avgDia,
        map: calculateMAP(avgSys, avgDia),
        pulse_pressure: calculatePulsePressure(avgSys, avgDia),
      });
    },
  );

  // --- log_reading ---
  server.registerTool(
    "log_reading",
    {
      title: "Log Reading",
      description:
        "Record a new health reading. Provide any subset of fields — blood pressure, pulse, " +
        "weight, glucose, sleep, steps, nutrition etc. MAP and pulse pressure are computed " +
        "automatically when systolic and diastolic are both supplied. " +
        "recorded_at defaults to now if omitted.",
      inputSchema: {
        recorded_at: z.string().optional()
          .describe("ISO timestamp of the reading. Defaults to now."),
        systolic: z.number().int().optional().describe("Systolic BP (mmHg)."),
        diastolic: z.number().int().optional().describe("Diastolic BP (mmHg)."),
        pulse: z.number().int().optional().describe("Pulse (bpm)."),
        weight_kg: z.number().optional().describe("Weight in kilograms."),
        waist_cm: z.number().optional().describe("Waist circumference in cm."),
        glucose_mmol: z.number().optional().describe("Blood glucose (mmol/L)."),
        mounjaro_dose_mg: z.number().optional().describe("Mounjaro/tirzepatide dose (mg)."),
        sleep_hours: z.number().optional().describe("Hours slept."),
        steps: z.number().int().optional().describe("Step count."),
        calories: z.number().int().optional().describe("Calories consumed (kcal)."),
        protein_g: z.number().optional().describe("Protein (g)."),
        fat_g: z.number().optional().describe("Fat (g)."),
        carbs_g: z.number().optional().describe("Carbohydrate (g)."),
        sugar_g: z.number().optional().describe("Sugar (g)."),
        alcohol_units: z.number().optional().describe("Alcohol units."),
        hrv_ms: z.number().optional().describe("Heart-rate variability (ms)."),
        vo2_max: z.number().optional().describe("VO2 max."),
        notes: z.string().optional().describe("Free-text notes."),
      },
    },
    async (params) => {
      const { recorded_at, ...rest } = params;
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined) row[k] = v;
      }
      if (Object.keys(row).length === 0) {
        return errorResult("Provide at least one measurement to log.");
      }
      if (recorded_at) row.recorded_at = recorded_at;

      // Derive MAP / pulse pressure when both BP values are present.
      if (typeof row.systolic === "number" && typeof row.diastolic === "number") {
        row.map = calculateMAP(row.systolic, row.diastolic);
        row.pulse_pressure = calculatePulsePressure(row.systolic, row.diastolic);
      }

      const { data, error } = await db
        .insert("health_readings", row)
        .select(READING_COLUMNS)
        .single();
      if (error) return errorResult(`Failed to log reading: ${error.message}`);
      return jsonResult({ message: "Reading logged.", reading: data });
    },
  );
}
