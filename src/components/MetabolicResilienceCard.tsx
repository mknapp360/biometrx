import { useNavigate } from 'react-router-dom'
import { Activity, ChevronRight } from 'lucide-react'
import { useRef } from 'react'
import type { WorkoutSession } from '../types'
import { computeResilienceScore, resilienceLabel, resilienceColor } from '../utils/metabolicResilience'
import { CATEGORY_LABELS, CATEGORY_COLORS, fmtDuration, type BioMetRxCategory } from '../utils/workoutClassification'

interface Props {
  recentWorkouts: WorkoutSession[]
  avgDailySteps: number
  latestHRV: number | null
  avgDeepSleepMin: number | null
  avgRemSleepMin: number | null
  latestVO2Max: number | null
  pressureScore: number | null
}

export default function MetabolicResilienceCard({
  recentWorkouts,
  avgDailySteps,
  latestHRV,
  avgDeepSleepMin,
  avgRemSleepMin,
  latestVO2Max,
  pressureScore,
}: Props) {
  const navigate = useNavigate()
  const tapCount = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const breakdown = computeResilienceScore({
    workouts: recentWorkouts,
    avgDailySteps,
    latestHRV,
    avgDeepSleepMin,
    avgRemSleepMin,
    latestVO2Max,
  })

  const score = breakdown.total
  const label = resilienceLabel(score)
  const color = resilienceColor(score)

  const handleTap = () => {
    tapCount.current += 1
    if (tapTimer.current) clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(() => {
      if (tapCount.current >= 2) navigate('/workouts')
      tapCount.current = 0
    }, 300)
  }

  // Category summary for 7-day workouts
  const categoryCounts: Partial<Record<string, number>> = {}
  for (const w of recentWorkouts) {
    categoryCounts[w.biometrx_category] = (categoryCounts[w.biometrx_category] ?? 0) + 1
  }

  const totalDurationMin = recentWorkouts.reduce((sum, w) => sum + w.duration_min, 0)

  // Context: how resilience relates to current pressure
  const pressureContext = pressureScore !== null
    ? pressureScore >= 75
      ? 'High pressure — resilience is key to metabolic recovery'
      : pressureScore >= 50
      ? 'Moderate pressure — building resilience will improve response'
      : 'Low pressure — maintain your activity to lock in improvements'
    : null

  return (
    <div
      className="card border-l-4 border-l-[#8b5cf6] space-y-3 cursor-pointer select-none"
      onClick={handleTap}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#8b5cf6]" />
          <p className="text-sm font-semibold text-gray-300">Metabolic Resilience</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">Details</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
        </div>
      </div>

      {/* Score bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-sm font-medium" style={{ color }}>{label}</span>
        </div>
        <div className="h-2 bg-[#1e3029] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* 7-day summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#1a2820] rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-gray-100">{recentWorkouts.length}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Workouts</p>
        </div>
        <div className="bg-[#1a2820] rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-gray-100">{fmtDuration(totalDurationMin)}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Active time</p>
        </div>
        <div className="bg-[#1a2820] rounded-xl p-2.5 text-center">
          <p className="text-base font-bold text-gray-100">
            {latestHRV !== null ? `${latestHRV}ms` : '—'}
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">HRV</p>
        </div>
      </div>

      {/* Category pills */}
      {Object.keys(categoryCounts).length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
              style={{ backgroundColor: CATEGORY_COLORS[cat as BioMetRxCategory] + '33', color: CATEGORY_COLORS[cat as BioMetRxCategory] }}
            >
              {CATEGORY_LABELS[cat as BioMetRxCategory] ?? cat} ×{count}
            </span>
          ))}
        </div>
      )}

      {recentWorkouts.length === 0 && (
        <p className="text-xs text-gray-500 italic">No workouts recorded in the last 7 days</p>
      )}

      {pressureContext && (
        <p className="text-[11px] text-gray-500 leading-relaxed border-t border-[#1e3029] pt-2">
          {pressureContext}
        </p>
      )}
    </div>
  )
}
