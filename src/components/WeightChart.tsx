import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import type { HealthReading } from '../types'

type ChartRange = '7' | '30' | '90' | 'all'

interface RawPoint {
  date: string
  weight?: number
  calories?: number
  steps?: number
}

interface IndexedPoint {
  date: string
  weightIdx?: number
  caloriesIdx?: number
  stepsIdx?: number
}

export default function WeightChart({ readings }: { readings: HealthReading[] }) {
  const [range, setRange] = useState<ChartRange>('30')
  const navigate = useNavigate()

  const { indexed, firstWeight, lastWeight, delta, hasCalories, hasSteps } = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    const filtered = [...readings]
      .filter(r => (r.weight_kg != null || r.calories != null || r.steps != null) && (!cutoff || new Date(r.recorded_at) >= cutoff))
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    const rawPoints: RawPoint[] = filtered.map(r => ({
      date: format(new Date(r.recorded_at), 'dd MMM'),
      weight: r.weight_kg != null ? Number(r.weight_kg) : undefined,
      calories: r.calories != null ? Number(r.calories) : undefined,
      steps: r.steps != null ? Number(r.steps) : undefined,
    }))

    // Find first value of each metric for indexing
    const firstW = rawPoints.find(p => p.weight !== undefined)?.weight
    const firstC = rawPoints.find(p => p.calories !== undefined)?.calories
    const firstS = rawPoints.find(p => p.steps !== undefined)?.steps

    // Index all values to 100 at start of period
    const indexedPoints: IndexedPoint[] = rawPoints.map(p => ({
      date: p.date,
      weightIdx: p.weight !== undefined && firstW ? (p.weight / firstW) * 100 : undefined,
      caloriesIdx: p.calories !== undefined && firstC ? (p.calories / firstC) * 100 : undefined,
      stepsIdx: p.steps !== undefined && firstS ? (p.steps / firstS) * 100 : undefined,
    }))

    const weights = rawPoints.filter(p => p.weight !== undefined)
    const fw = weights.length > 0 ? weights[0]!.weight! : null
    const lw = weights.length > 0 ? weights[weights.length - 1]!.weight! : null
    const d = fw !== null && lw !== null ? lw - fw : null

    return {
      indexed: indexedPoints,
      firstWeight: fw,
      lastWeight: lw,
      delta: d,
      hasCalories: rawPoints.some(p => p.calories !== undefined),
      hasSteps: rawPoints.some(p => p.steps !== undefined),
    }
  }, [readings, range])

  if (readings.filter(r => r.weight_kg != null).length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No weight data yet</div>
  }

  return (
    <div className="card cursor-pointer" onDoubleClick={() => navigate('/weight-drivers')}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Weight Drivers</h3>
          <p className="text-[9px] text-gray-500">Indexed to 100 at start of period</p>
        </div>
        <div className="flex gap-1">
          {(['7', '30', '90', 'all'] as ChartRange[]).map(r => (
            <button
              key={r}
              onClick={(e) => { e.stopPropagation(); setRange(r) }}
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
        <div className="flex gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green inline-block" /> Weight
          </span>
          {hasCalories && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] inline-block" /> Calories
            </span>
          )}
          {hasSteps && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f97316] inline-block" /> Steps
            </span>
          )}
        </div>
        {delta !== null && (
          <div className="flex items-baseline gap-1">
            <span className="text-[11px] text-gray-500">{firstWeight?.toFixed(1)} → {lastWeight?.toFixed(1)} kg</span>
            <span className={`text-xs font-bold ${delta <= 0 ? 'text-brand-green' : 'text-warning'}`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}
            </span>
          </div>
        )}
      </div>

      <IndexedSVGChart data={indexed} />

      <p className="text-[9px] text-gray-600 text-center mt-1">Double-tap for detail</p>
    </div>
  )
}

function IndexedSVGChart({ data }: { data: IndexedPoint[] }) {
  const W = 500
  const H = 180
  const PAD = { top: 15, right: 15, bottom: 25, left: 35 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data for this range</div>
  }

  // Gather all indexed values to compute shared Y range
  const allVals: number[] = []
  for (const d of data) {
    if (d.weightIdx !== undefined) allVals.push(d.weightIdx)
    if (d.caloriesIdx !== undefined) allVals.push(d.caloriesIdx)
    if (d.stepsIdx !== undefined) allVals.push(d.stepsIdx)
  }

  if (allVals.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data for this range</div>
  }

  const yMin = Math.floor(Math.min(...allVals) - 5)
  const yMax = Math.ceil(Math.max(...allVals) + 5)
  const yRange = yMax - yMin || 1

  const toX = (i: number) => PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH

  function buildLine(key: keyof IndexedPoint) {
    const dots: { x: number; y: number }[] = []
    const segs: string[] = []
    data.forEach((d, i) => {
      const v = d[key]
      if (v === undefined || typeof v !== 'number') return
      const x = toX(i); const y = toY(v)
      dots.push({ x, y })
      segs.push(`${segs.length === 0 ? 'M' : 'L'}${x},${y}`)
    })
    return { dots, path: segs.join(' ') }
  }

  const weightLine = buildLine('weightIdx')
  const calLine = buildLine('caloriesIdx')
  const stepsLine = buildLine('stepsIdx')

  // Y-axis ticks
  const tickCount = 4
  const yTicks: number[] = []
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round(yMin + (yRange * i) / tickCount))
  }

  // Baseline at 100
  const baseline100InRange = yMin <= 100 && yMax >= 100

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* Grid */}
      {yTicks.map((v, i) => {
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1e3029" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="9">{v}</text>
          </g>
        )
      })}

      {/* 100 baseline */}
      {baseline100InRange && (
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(100)} y2={toY(100)} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
      )}

      {/* Steps line (back) */}
      {stepsLine.path && <path d={stepsLine.path} fill="none" stroke="#f97316" strokeWidth="2" opacity="0.8" />}
      {stepsLine.dots.map((dot, i) => (
        <circle key={`sd${i}`} cx={dot.x} cy={dot.y} r="4" fill="#f97316" />
      ))}

      {/* Calories line (mid) */}
      {calLine.path && <path d={calLine.path} fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.8" />}
      {calLine.dots.map((dot, i) => (
        <circle key={`cd${i}`} cx={dot.x} cy={dot.y} r="4" fill="#8b5cf6" />
      ))}

      {/* Weight line (front) */}
      {weightLine.path && <path d={weightLine.path} fill="none" stroke="#29ab00" strokeWidth="2" />}
      {weightLine.dots.map((dot, i) => (
        <circle key={`wd${i}`} cx={dot.x} cy={dot.y} r="4" fill="#29ab00" />
      ))}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="10">{d.date}</text>
      ))}
    </svg>
  )
}
