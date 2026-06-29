// BiometRx Age tools: the flagship composite health score, plus rule-based insights.
// Combines the latest reading + latest blood panel and the user's date of birth.

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ScopedDb } from "../lib/db.ts";
import { calculateHealthScore } from "../lib/healthScore.ts";
import { jsonResult, errorResult, ageFromDob } from "./_helpers.ts";

export function registerScoreTools(server: McpServer, db: ScopedDb) {
  // --- get_biometrx_age ---
  server.registerTool(
    "get_biometrx_age",
    {
      title: "Get BiometRx Age",
      description:
        "Compute the BiometRx Age and Health Score (0-100) from the latest blood pressure / " +
        "waist reading and the latest blood panel. Returns the score, the age adjustment, the " +
        "BiometRx Age (chronological age + adjustment), the per-factor breakdown, and the " +
        "Max Potential Age with the biggest improvement opportunities.",
      inputSchema: {},
    },
    async () => {
      const [readingRes, panelRes, meta] = await Promise.all([
        db.from("health_readings", "systolic, diastolic, waist_cm")
          .order("recorded_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("blood_panels",
          "hba1c, triglycerides, hdl, ldl, egfr, creatinine, testosterone, fasting_insulin, alt, ggt, uric_acid")
          .order("test_date", { ascending: false }).limit(1).maybeSingle(),
        db.getUserMetadata(),
      ]);

      if (readingRes.error) return errorResult(`Error: ${readingRes.error.message}`);
      if (panelRes.error) return errorResult(`Error: ${panelRes.error.message}`);

      const age = ageFromDob(meta.date_of_birth as string | undefined);
      const result = calculateHealthScore(readingRes.data, panelRes.data, age);

      if (result.score === null) {
        return jsonResult({
          message: "Not enough data to compute a score. Log a blood pressure reading and/or a blood panel.",
          ...result,
        });
      }

      return jsonResult({
        chronological_age: age,
        health_score: result.score,
        age_adjustment: result.ageAdjustment,
        biometrx_age: result.biometrxAge,
        factors_used: `${result.availableFactors}/${result.totalFactors}`,
        breakdown: result.breakdown,
        max_potential: result.potential,
      });
    },
  );

  // --- get_insights ---
  server.registerTool(
    "get_insights",
    {
      title: "Get Health Insights",
      description:
        "Rule-based insights from recent readings: BP trend (7-day vs 30-day), weight + BP " +
        "co-movement, sleep/BP association, pulse pressure and MAP flags, and high-systolic " +
        "warnings.",
      inputSchema: {},
    },
    async () => {
      const { data, error } = await db
        .from("health_readings",
          "recorded_at, systolic, diastolic, weight_kg, sleep_hours, map, pulse_pressure")
        .order("recorded_at", { ascending: false })
        .limit(200);
      if (error) return errorResult(`Error: ${error.message}`);

      type R = {
        recorded_at: string;
        systolic: number | null;
        diastolic: number | null;
        weight_kg: number | null;
        sleep_hours: number | null;
        map: number | null;
        pulse_pressure: number | null;
      };
      const readings = (data ?? []) as R[];
      const insights: { type: string; title: string; message: string }[] = [];

      if (readings.length < 2) {
        return jsonResult({
          insights: [{
            type: "info",
            title: "Keep logging",
            message: "Add more readings to start seeing insights and trends.",
          }],
        });
      }

      const now = Date.now();
      const avgBP = (days: number) => {
        const cutoff = now - days * 86400000;
        const f = readings.filter((r) =>
          r.systolic != null && r.diastolic != null && new Date(r.recorded_at).getTime() >= cutoff
        );
        if (f.length === 0) return null;
        return {
          systolic: Math.round(f.reduce((s, r) => s + r.systolic!, 0) / f.length),
          diastolic: Math.round(f.reduce((s, r) => s + r.diastolic!, 0) / f.length),
        };
      };

      const avg7 = avgBP(7);
      const avg30 = avgBP(30);

      if (avg7 && avg30 && avg7.systolic < avg30.systolic) {
        insights.push({
          type: "positive",
          title: "BP improving",
          message: `Your 7-day average systolic (${avg7.systolic}) is lower than your 30-day average (${avg30.systolic}). Keep it up.`,
        });
      }

      // Weight change over 30 days
      const cutoff30 = now - 30 * 86400000;
      const withWeight = readings
        .filter((r) => r.weight_kg != null && new Date(r.recorded_at).getTime() >= cutoff30)
        .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
      let weightChange30: number | null = null;
      if (withWeight.length >= 2) {
        weightChange30 = Math.round(
          (withWeight[withWeight.length - 1].weight_kg! - withWeight[0].weight_kg!) * 100,
        ) / 100;
      }
      if (weightChange30 != null && weightChange30 < 0 && avg7 && avg30 && avg7.systolic < avg30.systolic) {
        insights.push({
          type: "positive",
          title: "Weight and BP both down",
          message: `Weight is down ${Math.abs(weightChange30)} kg over 30 days and your systolic pressure is also trending lower. These often go hand in hand.`,
        });
      }

      // Sleep / BP association (last 7 days)
      const cutoff7 = now - 7 * 86400000;
      const recent = readings.filter((r) => new Date(r.recorded_at).getTime() >= cutoff7);
      const lowSleepHighBP = recent.filter(
        (r) => r.sleep_hours != null && r.sleep_hours < 6 && r.systolic != null && r.systolic > 130,
      );
      if (lowSleepHighBP.length >= 2) {
        insights.push({
          type: "warning",
          title: "Sleep may be affecting BP",
          message: `You've had ${lowSleepHighBP.length} readings with under 6 hours sleep and elevated BP in the past week. Poor sleep can raise blood pressure.`,
        });
      }

      // Latest reading flags
      const latest = readings[0];
      if (latest?.pulse_pressure != null && latest.pulse_pressure > 60) {
        insights.push({
          type: "warning",
          title: "Pulse pressure worth watching",
          message: `Your latest pulse pressure is ${latest.pulse_pressure} mmHg. Values above 60 can indicate arterial stiffness — worth monitoring over time.`,
        });
      }
      if (latest?.map != null && latest.map > 100) {
        insights.push({
          type: "warning",
          title: "Cardiovascular load elevated",
          message: `Your latest MAP is ${latest.map.toFixed(1)} mmHg. A MAP above 100 suggests your cardiovascular system is working harder than ideal.`,
        });
      }
      if (avg7 && avg7.systolic > 140) {
        insights.push({
          type: "severe",
          title: "Systolic consistently high",
          message: `Your 7-day average systolic is ${avg7.systolic} mmHg. If this persists, consider discussing with your GP.`,
        });
      }

      if (insights.length === 0) {
        insights.push({
          type: "positive",
          title: "Looking good",
          message: "No concerns flagged from your recent readings. Keep tracking consistently.",
        });
      }

      return jsonResult({ insights });
    },
  );
}
