import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import type { HealthReading } from '../types'

type ChartRange = '7' | '30' | '90' | 'all'

interface IndexedPoint {
  date: string
  weightIdx?: number
  waistIdx?: number
  pressureIdx?: number
}

function computePressureScore(r: HealthReading): number | null {
  const hasDietary =
    r.sugar_g != null || r.refined_starch_g != null ||
    r.alcohol_units != null || r.ultra_processed_score != null || r.fibre_g != null
  if (!hasDietary) return null

  const score =
    (r.sugar_g != null ? Number(r.sugar_g) * 0.45 : 0) +
    (r.refined_starch_g != null ? Number(r.refined_starch_g) * 0.18 : 0) +
    (r.alcohol_units != null ? Number(r.alcohol_units) * 9 : 0) +
    (r.ultra_processed_score != null ? Number(r.ultra_processed_score) * 18 : 0) -
    (r.fibre_g != null ? Number(r.fibre_g) * 0.5 : 0)

  return Math.max(0, score)
}

export default function WeightChart({ readings }: { readings: HealthReading[] }) {
  const [range, setRange] = useState<ChartRange>('30')
  const navigate = useNavigate()

  const { indexed, firstWeight, lastWeight, delta, hasWaist, hasPressure } = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    const filtered = [...readings]
      .filter(r => {
        const hasAny = r.weight_kg != null || r.waist_cm != null || computePressureScore(r) !== null
        return hasAny && (!cutoff || new Date(r.recorded_at) >= cutoff)
      })
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    const rawPoints = filtered.map(r => ({
      date: format(new Date(r.recorded_at), 'dd MMM'),
      weight: r.weight_kg != null ? Number(r.weight_kg) : undefined,
      waist: r.waist_cm != null ? Number(r.waist_cm) : undefined,
      pressure: computePressureScore(r) ?? undefined,
    }))

    const firstW = rawPoints.find(p => p.weight !== undefined)?.weight
    const firstWaist = rawPoints.find(p => p.waist !== undefined)?.waist
    const firstP = rawPoints.find(p => p.pressure !== undefined)?.pressure

    const indexedPoints: IndexedPoint[] = rawPoints.map(p => ({
      date: p.date,
      weightIdx: p.weight !== undefined && firstW ? (p.weight / firstW) * 100 : undefined,
      waistIdx: p.waist !== undefined && firstWaist ? (p.waist / firstWaist) * 100 : undefined,
      pressureIdx: p.pressure !== undefined && firstP && firstP > 0
        ? (p.pressure / firstP) * 100
        : undefined,
    }))

    const weights = rawPoints.filter(p => p.weight !== undefined)
    const fw = weights[0]?.weight ?? null
    const lw = weights[weights.length - 1]?.weight ?? null

    return {
      indexed: indexedPoints,
      firstWeight: fw,
      lastWeight: lw,
      delta: fw !== null && lw !== null ? lw - fw : null,
      hasWaist: rawPoints.some(p => p.waist !== undefined),
      hasPressure: rawPoints.some(p => p.pressure !== undefined),
    }
  }, [readings, range])

  if (readings.filter(r => r.weight_kg != null).length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No weight data yet</div>
  }

  return (
    <div className="card cursor-pointer" onDoubleClick={() => navigate('/weight-drivers')}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-sm font-bold text-gray-200">Metabolic Overview</h3>
          <p className="text-[9px] text-gray-500">Indexed to 100 at start — lower pressure is better</p>
        </div>
        <div className="flex gap-1">
          {(['7', '30', '90', 'all'] as ChartRange[]).map(r => (
            <button
              key={r}
              onClick={(e) => { e.stopPropagation(); setRange(r) }}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                range === r ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {r === 'all' ? 'All' : `${r}D`}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-green inline-block" /> Weight
          </span>
          {hasWaist && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#2dd4bf] inline-block" /> Waist
            </span>
          )}
          {hasPressure && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] inline-block" /> Pressure
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

      <MetabolicSVGChart data={indexed} hasWaist={hasWaist} hasPressure={hasPressure} />

      <p className="text-[9px] text-gray-600 text-center mt-1">Double-tap for detail</p>
    </div>
  )
}

function MetabolicSVGChart({ data, hasWaist, hasPressure }: {
  data: IndexedPoint[]
  hasWaist: boolean
  hasPressure: boolean
}) {
  const W = 500
  const H = 180
  const PAD = { top: 15, right: 15, bottom: 25, left: 35 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data for this range</div>
  }

  const allVals: number[] = []
  for (const d of data) {
    if (d.weightIdx !== undefined) allVals.push(d.weightIdx)
    if (d.waistIdx !== undefined) allVals.push(d.waistIdx)
    if (d.pressureIdx !== undefined) allVals.push(d.pressureIdx)
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
  const waistLine = buildLine('waistIdx')
  const pressureLine = buildLine('pressureIdx')

  const tickCount = 4
  const yTicks: number[] = []
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round(yMin + (yRange * i) / tickCount))
  }

  const baseline100InRange = yMin <= 100 && yMax >= 100

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {yTicks.map((v, i) => {
        const y = toY(v)
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1e3029" strokeDasharray="3 3" />
            <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="9">{v}</text>
          </g>
        )
      })}

      {baseline100InRange && (
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(100)} y2={toY(100)} stroke="#374151" strokeWidth="1" strokeDasharray="4 4" />
      )}

      {/* Pressure line (back — amber) */}
      {hasPressure && pressureLine.path && (
        <path d={pressureLine.path} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.85" />
      )}
      {hasPressure && pressureLine.dots.map((dot, i) => (
        <circle key={`pd${i}`} cx={dot.x} cy={dot.y} r="3.5" fill="#f59e0b" />
      ))}

      {/* Waist line (mid — teal) */}
      {hasWaist && waistLine.path && (
        <path d={waistLine.path} fill="none" stroke="#2dd4bf" strokeWidth="2" opacity="0.85" />
      )}
      {hasWaist && waistLine.dots.map((dot, i) => (
        <circle key={`wd${i}`} cx={dot.x} cy={dot.y} r="3.5" fill="#2dd4bf" />
      ))}

      {/* Weight line (front — green) */}
      {weightLine.path && <path d={weightLine.path} fill="none" stroke="#29ab00" strokeWidth="2.5" />}
      {weightLine.dots.map((dot, i) => (
        <circle key={`wt${i}`} cx={dot.x} cy={dot.y} r="4" fill="#29ab00" />
      ))}

      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="10">{d.date}</text>
      ))}
    </svg>
  )
}
