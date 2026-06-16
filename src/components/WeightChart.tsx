import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import type { HealthReading } from '../types'

type ChartRange = '7' | '30' | '90' | 'all'

interface DataPoint {
  date: string
  weight?: number
  calories?: number
}

export default function WeightChart({ readings }: { readings: HealthReading[] }) {
  const [range, setRange] = useState<ChartRange>('30')

  const { data, firstWeight, lastWeight, delta, hasCalories } = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    const filtered = [...readings]
      .filter(r => (r.weight_kg != null || r.calories != null) && (!cutoff || new Date(r.recorded_at) >= cutoff))
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    const points: DataPoint[] = filtered.map(r => ({
      date: format(new Date(r.recorded_at), 'dd MMM'),
      weight: r.weight_kg != null ? Number(r.weight_kg) : undefined,
      calories: r.calories != null ? Number(r.calories) : undefined,
    }))

    const weights = points.filter(p => p.weight !== undefined)
    const fw = weights.length > 0 ? weights[0]!.weight! : null
    const lw = weights.length > 0 ? weights[weights.length - 1]!.weight! : null
    const d = fw !== null && lw !== null ? lw - fw : null
    const hasCal = points.some(p => p.calories !== undefined)

    return { data: points, firstWeight: fw, lastWeight: lw, delta: d, hasCalories: hasCal }
  }, [readings, range])

  if (readings.filter(r => r.weight_kg != null).length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No weight data yet</div>
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-200">Weight Trend</h3>
        <div className="flex gap-1">
          {(['7', '30', '90', 'all'] as ChartRange[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                range === r
                  ? 'bg-brand-green text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {r === 'all' ? 'All' : `${r}D`}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green inline-block" /> Weight
          </span>
          {hasCalories && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] inline-block" /> Calories
            </span>
          )}
        </div>
        {data.length >= 2 && delta !== null && (
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-gray-500">{firstWeight?.toFixed(1)} → {lastWeight?.toFixed(1)} kg</span>
            <span className={`text-xs font-bold ${delta <= 0 ? 'text-brand-green' : 'text-warning'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          </div>
        )}
      </div>
      <WeightSVGChart data={data} firstWeight={firstWeight} hasCalories={hasCalories} />
    </div>
  )
}

function WeightSVGChart({ data, firstWeight, hasCalories }: {
  data: DataPoint[]
  firstWeight: number | null
  hasCalories: boolean
}) {
  const W = 500
  const H = 180
  const PAD = { top: 15, right: hasCalories ? 45 : 15, bottom: 25, left: 45 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data for this range</div>
  }

  // Weight Y-axis
  const weightVals = data.filter(d => d.weight !== undefined).map(d => d.weight!)
  const wMin = weightVals.length > 0 ? Math.floor(Math.min(...weightVals) - 1) : 0
  const wMax = weightVals.length > 0 ? Math.ceil(Math.max(...weightVals) + 1) : 1
  const wRange = wMax - wMin || 1

  // Calories Y-axis
  const calVals = data.filter(d => d.calories !== undefined).map(d => d.calories!)
  const cMin = calVals.length > 0 ? Math.floor(Math.min(...calVals) - 100) : 0
  const cMax = calVals.length > 0 ? Math.ceil(Math.max(...calVals) + 100) : 3000
  const cRange = cMax - cMin || 1

  const toX = (i: number) => PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  const toYWeight = (v: number) => PAD.top + chartH - ((v - wMin) / wRange) * chartH
  const toYCal = (v: number) => PAD.top + chartH - ((v - cMin) / cRange) * chartH

  // Weight line
  const weightDots: { x: number; y: number }[] = []
  const weightSegs: string[] = []
  data.forEach((d, i) => {
    if (d.weight === undefined) return
    const x = toX(i); const y = toYWeight(d.weight)
    weightDots.push({ x, y })
    weightSegs.push(`${weightSegs.length === 0 ? 'M' : 'L'}${x},${y}`)
  })

  // Calories line
  const calDots: { x: number; y: number }[] = []
  const calSegs: string[] = []
  data.forEach((d, i) => {
    if (d.calories === undefined) return
    const x = toX(i); const y = toYCal(d.calories)
    calDots.push({ x, y })
    calSegs.push(`${calSegs.length === 0 ? 'M' : 'L'}${x},${y}`)
  })

  // Y ticks for weight
  const wTicks: number[] = []
  for (let i = 0; i <= 4; i++) wTicks.push(Math.round(wMin + (wRange * i) / 4))

  // Y ticks for calories
  const cTicks: number[] = []
  if (hasCalories) {
    for (let i = 0; i <= 4; i++) cTicks.push(Math.round(cMin + (cRange * i) / 4))
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* Grid */}
      {wTicks.map((v, i) => {
        const y = toYWeight(v)
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1e3029" strokeDasharray="3 3" />
            <text x={PAD.left - 8} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="10">{v}</text>
          </g>
        )
      })}

      {/* Calories Y-axis ticks (right side) */}
      {hasCalories && cTicks.map((v, i) => {
        const y = toYCal(v)
        return (
          <text key={`c${i}`} x={W - PAD.right + 8} y={y + 3} textAnchor="start" fill="#8b5cf6" fontSize="9">{v}</text>
        )
      })}

      {/* First weight reference line */}
      {firstWeight !== null && (
        <line x1={PAD.left} x2={W - PAD.right} y1={toYWeight(firstWeight)} y2={toYWeight(firstWeight)} stroke="#374151" strokeDasharray="4 4" />
      )}

      {/* Calories line + dots */}
      {calSegs.length > 0 && <path d={calSegs.join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="1.5" opacity="0.7" />}
      {calDots.map((dot, i) => (
        <circle key={`cd${i}`} cx={dot.x} cy={dot.y} r="3" fill="#8b5cf6" opacity="0.7" />
      ))}

      {/* Weight line + dots */}
      {weightSegs.length > 0 && <path d={weightSegs.join(' ')} fill="none" stroke="#29ab00" strokeWidth="2" />}
      {weightDots.map((dot, i) => (
        <circle key={`wd${i}`} cx={dot.x} cy={dot.y} r="4" fill="#29ab00" />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="10">{d.date}</text>
      ))}
    </svg>
  )
}
