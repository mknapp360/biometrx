// Blood-panel tools: read latest/history + log new lab panels.
// Table: public.blood_panels (metabolic, lipids, liver, kidney, inflammation, hormones)

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScopedDb } from "../lib/db.ts";
import { jsonResult, errorResult } from "./_helpers.ts";

const PANEL_COLUMNS =
  "id, test_date, hba1c, glucose, fasting_insulin, total_cholesterol, hdl, ldl, triglycerides, " +
  "alt, ast, ggt, creatinine, egfr, uric_acid, crp, testosterone, shbg, estradiol, notes";

export function registerBloodTools(server: McpServer, db: ScopedDb) {
  // --- get_latest_blood_panel ---
  server.registerTool(
    "get_latest_blood_panel",
    {
      title: "Get Latest Blood Panel",
      description:
        "Get the most recent blood test panel: HbA1c, glucose, fasting insulin, full lipid " +
        "profile, liver enzymes, kidney function, inflammation (CRP) and hormones.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await db
        .from("blood_panels", PANEL_COLUMNS)
        .order("test_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return errorResult(`Error: ${error.message}`);
      if (!data) return jsonResult({ message: "No blood panels logged yet." });
      return jsonResult(data);
    },
  );

  // --- list_blood_panels ---
  server.registerTool(
    "list_blood_panels",
    {
      title: "List Blood Panels",
      description: "List blood test panels, most recent first, for comparing labs over time.",
      inputSchema: {
        limit: z.number().int().positive().max(100).optional().default(10)
          .describe("Maximum number of panels to return (default 10)."),
      },
    },
    async ({ limit }) => {
      const { data, error } = await db
        .from("blood_panels", PANEL_COLUMNS)
        .order("test_date", { ascending: false })
        .limit(limit ?? 10);
      if (error) return errorResult(`Error: ${error.message}`);
      return jsonResult({ count: data?.length ?? 0, panels: data ?? [] });
    },
  );

  // --- log_blood_panel ---
  server.registerTool(
    "log_blood_panel",
    {
      title: "Log Blood Panel",
      description:
        "Record a new blood test panel. Provide test_date plus any subset of markers. " +
        "Units: HbA1c mmol/mol, glucose mmol/L, fasting insulin pmol/L, lipids mmol/L, " +
        "liver enzymes U/L, creatinine umol/L, eGFR mL/min, uric acid mmol/L, CRP mg/L, " +
        "testosterone nmol/L.",
      inputSchema: {
        test_date: z.string().describe("Date of the blood test (YYYY-MM-DD)."),
        hba1c: z.number().optional().describe("HbA1c (mmol/mol)."),
        glucose: z.number().optional().describe("Fasting glucose (mmol/L)."),
        fasting_insulin: z.number().optional().describe("Fasting insulin (pmol/L)."),
        total_cholesterol: z.number().optional().describe("Total cholesterol (mmol/L)."),
        hdl: z.number().optional().describe("HDL (mmol/L)."),
        ldl: z.number().optional().describe("LDL (mmol/L)."),
        triglycerides: z.number().optional().describe("Triglycerides (mmol/L)."),
        alt: z.number().optional().describe("ALT (U/L)."),
        ast: z.number().optional().describe("AST (U/L)."),
        ggt: z.number().optional().describe("GGT (U/L)."),
        creatinine: z.number().optional().describe("Creatinine (umol/L)."),
        egfr: z.number().optional().describe("eGFR (mL/min/1.73m2)."),
        uric_acid: z.number().optional().describe("Uric acid (mmol/L)."),
        crp: z.number().optional().describe("CRP (mg/L)."),
        testosterone: z.number().optional().describe("Total testosterone (nmol/L)."),
        shbg: z.number().optional().describe("SHBG (nmol/L)."),
        estradiol: z.number().optional().describe("Estradiol (pmol/L)."),
        notes: z.string().optional().describe("Free-text notes."),
      },
    },
    async (params) => {
      const row: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) row[k] = v;
      }
      const measured = Object.keys(row).filter((k) => k !== "test_date" && k !== "notes");
      if (measured.length === 0) {
        return errorResult("Provide at least one blood marker to log.");
      }
      const { data, error } = await db
        .insert("blood_panels", row)
        .select(PANEL_COLUMNS)
        .single();
      if (error) return errorResult(`Failed to log blood panel: ${error.message}`);
      return jsonResult({ message: "Blood panel logged.", panel: data });
    },
  );
}
