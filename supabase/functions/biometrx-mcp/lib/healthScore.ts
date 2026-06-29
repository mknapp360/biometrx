// BiometRx Age health-score engine — ported verbatim from the app's
// src/utils/healthScore.ts so the MCP returns the same numbers as the dashboard.
// Keep the scoring thresholds and weights in sync with that file.

export interface ScoreBreakdown {
  bp: number | null;
  hba1c: number | null;
  triglycerides: number | null;
  hdl: number | null;
  ldl: number | null;
  kidney: number | null;
  testosterone: number | null;
  fastingInsulin: number | null;
  alt: number | null;
  ggt: number | null;
  uricAcid: number | null;
  waist: number | null;
}

export interface Opportunity {
  factor: string;
  currentScore: number;
}

export interface PotentialAgeResult {
  potentialAge: number | null;
  recoverableYears: number | null;
  optimizedHealthScore: number;
  opportunities: Opportunity[];
}

export interface HealthScoreResult {
  score: number | null;
  biometrxAge: number | null;
  ageAdjustment: number | null;
  breakdown: ScoreBreakdown;
  availableFactors: number;
  totalFactors: number;
  potential: PotentialAgeResult | null;
}

// Minimal row shapes — only the fields the score needs.
export interface ReadingRow {
  systolic?: number | null;
  diastolic?: number | null;
  waist_cm?: number | string | null;
}

export interface PanelRow {
  hba1c?: number | string | null;
  triglycerides?: number | string | null;
  hdl?: number | string | null;
  ldl?: number | string | null;
  egfr?: number | string | null;
  creatinine?: number | string | null;
  testosterone?: number | string | null;
  fasting_insulin?: number | string | null;
  alt?: number | string | null;
  ggt?: number | string | null;
  uric_acid?: number | string | null;
}

// --- Individual scoring functions ---

function scoreBP(systolic: number, diastolic: number): number {
  if (systolic < 120 && diastolic < 80) return 100;
  if (systolic <= 129) return 90;
  if (systolic <= 139) return 75;
  if (systolic <= 149) return 60;
  if (systolic <= 159) return 40;
  return 20;
}

function scoreHba1c(val: number): number {
  if (val < 42) return 100;
  if (val <= 47) return 90;
  if (val <= 53) return 75;
  if (val <= 63) return 50;
  return 20;
}

function scoreTriglycerides(val: number): number {
  if (val < 1.7) return 100;
  if (val <= 2.2) return 80;
  if (val <= 4.0) return 60;
  if (val <= 6.0) return 40;
  return 20;
}

function scoreHDL(val: number): number {
  if (val > 1.5) return 100;
  if (val >= 1.2) return 80;
  if (val >= 1.0) return 60;
  return 40;
}

function scoreLDL(val: number): number {
  if (val < 2.0) return 100;
  if (val <= 2.9) return 80;
  if (val <= 3.9) return 60;
  return 40;
}

function scoreKidney(egfr: number | null, creatinine: number | null): number | null {
  if (egfr != null) {
    if (egfr > 90) return 100;
    if (egfr >= 60) return 80;
    if (egfr >= 45) return 60;
    if (egfr >= 30) return 40;
    return 20;
  }
  if (creatinine != null) {
    if (creatinine <= 90) return 100;
    if (creatinine <= 110) return 80;
    if (creatinine <= 130) return 60;
    if (creatinine <= 170) return 40;
    return 20;
  }
  return null;
}

function scoreTestosterone(val: number): number {
  if (val >= 15 && val <= 30) return 100;
  if (val >= 10) return 80;
  if (val >= 7) return 60;
  return 40;
}

function scoreFastingInsulin(val: number): number {
  if (val < 50) return 100;
  if (val <= 70) return 85;
  if (val <= 100) return 65;
  if (val <= 140) return 40;
  return 20;
}

function scoreALT(val: number): number {
  if (val < 25) return 100;
  if (val <= 35) return 85;
  if (val <= 45) return 65;
  if (val <= 60) return 45;
  return 20;
}

function scoreGGT(val: number): number {
  if (val < 20) return 100;
  if (val <= 35) return 85;
  if (val <= 50) return 65;
  if (val <= 80) return 40;
  return 20;
}

function scoreUricAcid(val: number): number {
  if (val < 0.30) return 100;
  if (val <= 0.36) return 85;
  if (val <= 0.42) return 65;
  if (val <= 0.50) return 40;
  return 20;
}

function scoreWaist(val: number): number {
  if (val < 80) return 100;
  if (val <= 88) return 85;
  if (val <= 94) return 70;
  if (val <= 102) return 50;
  if (val <= 110) return 35;
  return 20;
}

function ageAdjustmentFromScore(score: number): number {
  if (score >= 95) return -8;
  if (score >= 90) return -6;
  if (score >= 85) return -4;
  if (score >= 80) return -2;
  if (score >= 75) return 0;
  if (score >= 70) return 2;
  if (score >= 65) return 4;
  if (score >= 60) return 6;
  if (score >= 55) return 8;
  if (score >= 50) return 10;
  return 12;
}

const num = (v: number | string | null | undefined): number | null =>
  v == null ? null : Number(v);

// --- Main calculation ---

export function calculateHealthScore(
  latestReading: ReadingRow | null,
  latestPanel: PanelRow | null,
  chronologicalAge: number | null,
): HealthScoreResult {
  const weights: Record<keyof ScoreBreakdown, number> = {
    bp: 0.18,
    hba1c: 0.13,
    triglycerides: 0.10,
    hdl: 0.07,
    ldl: 0.07,
    kidney: 0.08,
    testosterone: 0.07,
    fastingInsulin: 0.12,
    alt: 0.06,
    ggt: 0.06,
    uricAcid: 0.06,
    waist: 0.10,
  };

  const breakdown: ScoreBreakdown = {
    bp: null,
    hba1c: null,
    triglycerides: null,
    hdl: null,
    ldl: null,
    kidney: null,
    testosterone: null,
    fastingInsulin: null,
    alt: null,
    ggt: null,
    uricAcid: null,
    waist: null,
  };

  if (latestReading?.systolic != null && latestReading?.diastolic != null) {
    breakdown.bp = scoreBP(latestReading.systolic, latestReading.diastolic);
  }
  if (latestReading?.waist_cm != null) {
    breakdown.waist = scoreWaist(Number(latestReading.waist_cm));
  }

  if (latestPanel) {
    const hba1c = num(latestPanel.hba1c);
    const trig = num(latestPanel.triglycerides);
    const hdl = num(latestPanel.hdl);
    const ldl = num(latestPanel.ldl);
    const testo = num(latestPanel.testosterone);
    const fIns = num(latestPanel.fasting_insulin);
    const alt = num(latestPanel.alt);
    const ggt = num(latestPanel.ggt);
    const uric = num(latestPanel.uric_acid);

    if (hba1c != null) breakdown.hba1c = scoreHba1c(hba1c);
    if (trig != null) breakdown.triglycerides = scoreTriglycerides(trig);
    if (hdl != null) breakdown.hdl = scoreHDL(hdl);
    if (ldl != null) breakdown.ldl = scoreLDL(ldl);
    breakdown.kidney = scoreKidney(num(latestPanel.egfr), num(latestPanel.creatinine));
    if (testo != null) breakdown.testosterone = scoreTestosterone(testo);
    if (fIns != null) breakdown.fastingInsulin = scoreFastingInsulin(fIns);
    if (alt != null) breakdown.alt = scoreALT(alt);
    if (ggt != null) breakdown.ggt = scoreGGT(ggt);
    if (uric != null) breakdown.uricAcid = scoreUricAcid(uric);
  }

  const entries = Object.entries(breakdown) as [keyof ScoreBreakdown, number | null][];
  const available = entries.filter(([, v]) => v !== null);
  const totalFactors = entries.length;
  const availableFactors = available.length;

  if (availableFactors === 0) {
    return {
      score: null,
      biometrxAge: null,
      ageAdjustment: null,
      breakdown,
      availableFactors,
      totalFactors,
      potential: null,
    };
  }

  const totalWeight = available.reduce((sum, [key]) => sum + weights[key], 0);
  const score = Math.round(
    available.reduce((sum, [key, val]) => sum + (val! * weights[key] / totalWeight), 0),
  );

  const ageAdj = ageAdjustmentFromScore(score);
  const biometrxAge = chronologicalAge != null ? chronologicalAge + ageAdj : null;

  const factorLabels: Record<keyof ScoreBreakdown, string> = {
    bp: "Blood Pressure",
    hba1c: "HbA1c",
    triglycerides: "Triglycerides",
    hdl: "HDL",
    ldl: "LDL",
    kidney: "Kidney Function",
    testosterone: "Testosterone",
    fastingInsulin: "Fasting Insulin",
    alt: "ALT",
    ggt: "GGT",
    uricAcid: "Uric Acid",
    waist: "Waist",
  };

  const improvable: Set<keyof ScoreBreakdown> = new Set([
    "bp", "hba1c", "triglycerides", "hdl", "ldl",
    "fastingInsulin", "alt", "ggt", "uricAcid", "waist",
  ]);

  const optimized: ScoreBreakdown = { ...breakdown };
  const opportunities: Opportunity[] = [];

  for (const [key, val] of available) {
    if (val === null) continue;
    if (improvable.has(key) && val < 100) {
      optimized[key] = 100;
      opportunities.push({ factor: factorLabels[key], currentScore: val });
    }
  }

  opportunities.sort((a, b) => a.currentScore - b.currentScore);

  const optimizedAvailable = (Object.entries(optimized) as [keyof ScoreBreakdown, number | null][])
    .filter(([, v]) => v !== null);
  const optTotalWeight = optimizedAvailable.reduce((sum, [key]) => sum + weights[key], 0);
  const optimizedHealthScore = Math.round(
    optimizedAvailable.reduce((sum, [key, val]) => sum + (val! * weights[key] / optTotalWeight), 0),
  );

  const optAgeAdj = ageAdjustmentFromScore(optimizedHealthScore);
  const potentialAge = chronologicalAge != null ? chronologicalAge + optAgeAdj : null;
  const recoverableYears = biometrxAge != null && potentialAge != null
    ? biometrxAge - potentialAge
    : null;

  const potential: PotentialAgeResult = {
    potentialAge,
    recoverableYears,
    optimizedHealthScore,
    opportunities,
  };

  return {
    score,
    biometrxAge,
    ageAdjustment: ageAdj,
    breakdown,
    availableFactors,
    totalFactors,
    potential,
  };
}
