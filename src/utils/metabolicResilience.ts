import type { WorkoutSession } from '../types'

export interface ResilienceInputs {
  workouts: WorkoutSession[]
  avgDailySteps: number
  latestHRV: number | null
  avgDeepSleepMin: number | null
  avgRemSleepMin: number | null
  latestVO2Max: number | null
}

export interface ResilienceBreakdown {
  workoutFrequency: number   // 0-25
  strengthFrequency: number  // 0-15
  cardioMinutes: number      // 0-15
  stepsAvg: number           // 0-15
  hrv: number                // 0-10
  sleepQuality: number       // 0-10
  vo2max: number             // 0-10
  total: number              // 0-100
}

export function computeResilienceScore(inputs: ResilienceInputs): ResilienceBreakdown {
  const { workouts, avgDailySteps, latestHRV, avgDeepSleepMin, avgRemSleepMin, latestVO2Max } = inputs

  // Workout frequency (last 7 days): 0 = 0, 1 = 8, 2 = 15, 3 = 20, 4+ = 25
  const workoutFreqScore = Math.min(workouts.length * 6.25, 25)

  // Strength session frequency (last 7 days): 0 = 0, 1 = 8, 2+ = 15
  const strengthCount = workouts.filter(w => w.biometrx_category === 'strength').length
  const strengthFreqScore = strengthCount === 0 ? 0 : strengthCount === 1 ? 8 : 15

  // Cardio minutes (running + cardio + cycling categories, last 7 days)
  const cardioCategories = new Set(['running', 'cardio', 'cycling', 'mixed'])
  const cardioMin = workouts
    .filter(w => cardioCategories.has(w.biometrx_category))
    .reduce((sum, w) => sum + w.duration_min, 0)
  const cardioMinScore = Math.min((cardioMin / 150) * 15, 15)

  // Steps (7-day average): 10k+ = 15, linear below
  const stepsScore = Math.min((avgDailySteps / 10000) * 15, 15)

  // HRV: 0 = 0, 20ms = 2, 40ms = 5, 60ms = 8, 80ms+ = 10
  let hrvScore = 0
  if (latestHRV !== null) {
    if (latestHRV >= 80) hrvScore = 10
    else if (latestHRV >= 60) hrvScore = 8
    else if (latestHRV >= 40) hrvScore = 5
    else if (latestHRV >= 20) hrvScore = 2
  }

  // Sleep quality: deep + REM combined (minutes per night)
  // Target: deep ≥ 90min, rem ≥ 90min = 10 pts
  const deep = avgDeepSleepMin ?? 0
  const rem = avgRemSleepMin ?? 0
  const sleepScore = (avgDeepSleepMin !== null || avgRemSleepMin !== null)
    ? Math.min(((deep + rem) / 180) * 10, 10)
    : 0

  // VO2 max (ml/kg/min): ≤30 = 2, 35 = 5, 40 = 7, 45+ = 10
  let vo2Score = 0
  if (latestVO2Max !== null) {
    if (latestVO2Max >= 45) vo2Score = 10
    else if (latestVO2Max >= 40) vo2Score = 7
    else if (latestVO2Max >= 35) vo2Score = 5
    else if (latestVO2Max > 0) vo2Score = 2
  }

  const total = Math.round(
    workoutFreqScore + strengthFreqScore + cardioMinScore +
    stepsScore + hrvScore + sleepScore + vo2Score
  )

  return {
    workoutFrequency: Math.round(workoutFreqScore),
    strengthFrequency: Math.round(strengthFreqScore),
    cardioMinutes: Math.round(cardioMinScore),
    stepsAvg: Math.round(stepsScore),
    hrv: Math.round(hrvScore),
    sleepQuality: Math.round(sleepScore),
    vo2max: Math.round(vo2Score),
    total,
  }
}

export function resilienceLabel(score: number): string {
  if (score >= 85) return 'Excellent'
  if (score >= 70) return 'Strong'
  if (score >= 50) return 'Moderate'
  if (score >= 25) return 'Building'
  return 'Low'
}

export function resilienceColor(score: number): string {
  if (score >= 70) return '#29ab00'
  if (score >= 50) return '#f59e0b'
  if (score >= 25) return '#f97316'
  return '#ef4444'
}
