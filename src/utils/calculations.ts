import { subDays } from 'date-fns'
import type { AverageBP, HealthReading, Insight } from '../types'

export function calculateMAP(systolic: number, diastolic: number): number {
  return Math.round(((systolic + 2 * diastolic) / 3) * 100) / 100
}

export function calculatePulsePressure(systolic: number, diastolic: number): number {
  return systolic - diastolic
}

export function getAverageBP(readings: HealthReading[], days: number): AverageBP | null {
  const cutoff = subDays(new Date(), days)
  const filtered = readings.filter(r => r.systolic != null && r.diastolic != null && new Date(r.recorded_at) >= cutoff)
  if (filtered.length === 0) return null

  const avgSys = filtered.reduce((sum, r) => sum + r.systolic!, 0) / filtered.length
  const avgDia = filtered.reduce((sum, r) => sum + r.diastolic!, 0) / filtered.length

  return {
    systolic: Math.round(avgSys),
    diastolic: Math.round(avgDia),
  }
}

export function getWeightChange(readings: HealthReading[], days: number): number | null {
  const cutoff = subDays(new Date(), days)
  const withWeight = readings
    .filter(r => r.weight_kg !== null && new Date(r.recorded_at) >= cutoff)
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

  if (withWeight.length < 2) return null

  const earliest = withWeight[0]!.weight_kg!
  const latest = withWeight[withWeight.length - 1]!.weight_kg!
  return Math.round((latest - earliest) * 100) / 100
}

export function getLatestReading(readings: HealthReading[]): HealthReading | null {
  if (readings.length === 0) return null
  return readings.reduce((latest, r) =>
    new Date(r.recorded_at) > new Date(latest.recorded_at) ? r : latest
  )
}

export function generateInsights(readings: HealthReading[]): Insight[] {
  const insights: Insight[] = []

  if (readings.length < 2) {
    insights.push({
      type: 'info',
      title: 'Keep logging',
      message: 'Add more readings to start seeing insights and trends.',
    })
    return insights
  }

  const avg7 = getAverageBP(readings, 7)
  const avg30 = getAverageBP(readings, 30)

  // Systolic improvement
  if (avg7 && avg30 && avg7.systolic < avg30.systolic) {
    insights.push({
      type: 'positive',
      title: 'BP improving',
      message: `Your 7-day average systolic (${avg7.systolic}) is lower than your 30-day average (${avg30.systolic}). Keep it up.`,
    })
  }

  // Weight and systolic both trending down
  const weightChange30 = getWeightChange(readings, 30)
  if (weightChange30 !== null && weightChange30 < 0 && avg7 && avg30 && avg7.systolic < avg30.systolic) {
    insights.push({
      type: 'positive',
      title: 'Weight and BP both down',
      message: `Weight is down ${Math.abs(weightChange30)} kg over 30 days and your systolic pressure is also trending lower. These often go hand in hand.`,
    })
  }

  // Sleep and BP association
  const cutoff7 = subDays(new Date(), 7)
  const recent = readings.filter(r => new Date(r.recorded_at) >= cutoff7)
  const lowSleepHighBP = recent.filter(
    r => r.sleep_hours !== null && r.sleep_hours < 6 && r.systolic != null && r.systolic > 130
  )
  if (lowSleepHighBP.length >= 2) {
    insights.push({
      type: 'warning',
      title: 'Sleep may be affecting BP',
      message: `You've had ${lowSleepHighBP.length} readings with under 6 hours sleep and elevated BP in the past week. Poor sleep can raise blood pressure.`,
    })
  }

  // Pulse pressure > 60
  const latest = getLatestReading(readings)
  if (latest && latest.pulse_pressure !== null && latest.pulse_pressure > 60) {
    insights.push({
      type: 'warning',
      title: 'Pulse pressure worth watching',
      message: `Your latest pulse pressure is ${latest.pulse_pressure} mmHg. Values above 60 can indicate arterial stiffness — worth monitoring over time.`,
    })
  }

  // MAP > 100
  if (latest && latest.map !== null && latest.map > 100) {
    insights.push({
      type: 'warning',
      title: 'Cardiovascular load elevated',
      message: `Your latest MAP is ${latest.map.toFixed(1)} mmHg. A MAP above 100 suggests your cardiovascular system is working harder than ideal.`,
    })
  }

  // Systolic average > 140
  if (avg7 && avg7.systolic > 140) {
    insights.push({
      type: 'severe',
      title: 'Systolic consistently high',
      message: `Your 7-day average systolic is ${avg7.systolic} mmHg. If this persists, consider discussing with your GP.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      title: 'Looking good',
      message: 'No concerns flagged from your recent readings. Keep tracking consistently.',
    })
  }

  return insights
}
