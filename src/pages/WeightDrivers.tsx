import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { useReadings } from '../hooks/useReadings'
import { ArrowLeft, BarChart3, Table } from 'lucide-react'
import type { HealthReading } from '../types'

type ViewMode = 'graph' | 'table'
type ChartRange = '7' | '30' | '90' | 'all'

const UPF_LABELS = ['None', 'A little', 'Some', 'A lot']

function RangeButtons({ range, setRange }: { range: ChartRange; setRange: (r: ChartRange) => void }) {
  return (
    <div className="flex gap-1">
      {(['7', '30', '90', 'all'] as ChartRange[]).map(r => (
        <button
          key={r}
          onClick={() => setRange(r)}
          className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
            range === r ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {r === 'all' ? 'All' : `${r}D`}
        </button>
      ))}
    </div>
  )
}

interface TimelineDate {
  label: string
  timestamp: number
}

type MetricKey = 'weight' | 'waist' | 'calories' | 'steps' | 'sugar' | 'refined_starch' | 'fibre' | 'alcohol'

interface MetricConfig {
  label: string
  unit: string
  color: string
  extract: (r: HealthReading) => number | null
  decimals: number
  lowerIsBetter?: boolean
}

const METRIC_CONFIGS: Record<MetricKey, MetricConfig> = {
  weight: { label: 'Weight', unit: 'kg', color: '#29ab00', extract: r => r.weight_kg != null ? Number(r.weight_kg) : null, decimals: 1, lowerIsBetter: true },
  waist: { label: 'Waist', unit: 'cm', color: '#2dd4bf', extract: r => r.waist_cm != null ? Number(r.waist_cm) : null, decimals: 1, lowerIsBetter: true },
  calories: { label: 'Calories', unit: 'kcal', color: '#8b5cf6', extract: r => r.calories != null ? Number(r.calories) : null, decimals: 0 },
  steps: { label: 'Steps', unit: 'steps', color: '#f97316', extract: r => r.steps != null ? Number(r.steps) : null, decimals: 0 },
  sugar: { label: 'Sugar', unit: 'g', color: '#f59e0b', extract: r => r.sugar_g != null ? Number(r.sugar_g) : null, decimals: 1, lowerIsBetter: true },
  refined_starch: { label: 'Refined Starch', unit: 'g', color: '#ef4444', extract: r => r.refined_starch_g != null ? Number(r.refined_starch_g) : null, decimals: 1, lowerIsBetter: true },
  fibre: { label: 'Fibre', unit: 'g', color: '#34d399', extract: r => r.fibre_g != null ? Number(r.fibre_g) : null, decimals: 1 },
  alcohol: { label: 'Alcohol', unit: 'units', color: '#a78bfa', extract: r => r.alcohol_units != null ? Number(r.alcohol_units) : null, decimals: 1, lowerIsBetter: true },
}

function SingleMetricChart({ readings, metric, timeline }: {
  readings: HealthReading[]
  metric: MetricKey
  timeline: TimelineDate[]
}) {
  const { label, unit, color, extract, decimals, lowerIsBetter } = METRIC_CONFIGS[metric]

  const valueMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const r of readings) {
      const v = extract(r)
      if (v === null) continue
      const day = new Date(r.recorded_at)
      day.setHours(0, 0, 0, 0)
      map.set(day.getTime(), v)
    }
    return map
  }, [readings, extract])

  const points = timeline.map(t => ({ date: t.label, value: valueMap.get(t.timestamp) }))
  const withValues = points.filter(p => p.value !== undefined) as { date: string; value: number }[]

  if (withValues.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-bold mb-2" style={{ color }}>{label}</h3>
        <p className="text-xs text-gray-500 text-center py-6">No {label.toLowerCase()} data for this period</p>
      </div>
    )
  }

  const first = withValues[0]!.value
  const last = withValues[withValues.length - 1]!.value
  const delta = last - first
  const avg = withValues.reduce((s, d) => s + d.value, 0) / withValues.length

  const W = 500, H = 160
  const PAD = { top: 10, right: 15, bottom: 25, left: 45 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const vals = withValues.map(d => d.value)
  const spread = Math.max(...vals) - Math.min(...vals)
  const yMin = Math.floor(Math.min(...vals) - (spread * 0.15 || 1))
  const yMax = Math.ceil(Math.max(...vals) + (spread * 0.15 || 1))
  const yRange = yMax - yMin || 1

  const toX = (idx: number) => PAD.left + (timeline.length === 1 ? chartW / 2 : (idx / (timeline.length - 1)) * chartW)
  const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH

  const dots: { x: number; y: number }[] = []
  const segs: string[] = []
  points.forEach((p, i) => {
    if (p.value === undefined) return
    const x = toX(i); const y = toY(p.value)
    dots.push({ x, y })
    segs.push(`${segs.length === 0 ? 'M' : 'L'}${x},${y}`)
  })

  const yTicks: number[] = []
  for (let i = 0; i <= 4; i++) {
    const v = yMin + (yRange * i) / 4
    yTicks.push(decimals === 0 ? Math.round(v) : Math.round(v * 10) / 10)
  }

  const isGood = lowerIsBetter !== undefined ? (delta < 0) === lowerIsBetter : delta >= 0
  const deltaColor = delta === 0 ? '#6b7280' : isGood ? '#29ab00' : '#f59e0b'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold" style={{ color }}>{label}</h3>
        <div className="text-right">
          <span className="text-lg font-bold tabular-nums text-gray-100">
            {decimals > 0 ? last.toFixed(decimals) : last.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500 ml-1">{unit}</span>
        </div>
      </div>
      <div className="flex gap-4 mb-2">
        <div>
          <p className="text-[9px] text-gray-500 uppercase">Change</p>
          <p className="text-xs font-bold tabular-nums" style={{ color: deltaColor }}>
            {delta > 0 ? '+' : ''}{decimals > 0 ? delta.toFixed(decimals) : Math.round(delta).toLocaleString()} {unit}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-gray-500 uppercase">Average</p>
          <p className="text-xs font-semibold text-gray-300 tabular-nums">
            {decimals > 0 ? avg.toFixed(decimals) : Math.round(avg).toLocaleString()} {unit}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-gray-500 uppercase">Readings</p>
          <p className="text-xs font-semibold text-gray-300 tabular-nums">{withValues.length}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
        {yTicks.map((v, i) => {
          const y = toY(v)
          return (
            <g key={i}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1e3029" strokeDasharray="3 3" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="9">
                {decimals > 0 ? v.toFixed(decimals) : v.toLocaleString()}
              </text>
            </g>
          )
        })}
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(first)} y2={toY(first)} stroke="#374151" strokeDasharray="4 4" />
        {segs.length > 0 && <path d={segs.join(' ')} fill="none" stroke={color} strokeWidth="2" />}
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r="4" fill={color} />
        ))}
        {timeline.map((t, i) => (
          <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="10">{t.label}</text>
        ))}
      </svg>
    </div>
  )
}

export default function MetabolicDrivers() {
  const { readings, loading } = useReadings()
  const navigate = useNavigate()
  const [range, setRange] = useState<ChartRange>('30')
  const [view, setView] = useState<ViewMode>('graph')

  const { timeline, tableData, hasWaist, hasSugar, hasStarch, hasFibre, hasAlcohol } = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    type DayRow = {
      label: string
      weight?: number; waist?: number
      calories?: number; steps?: number
      sugar?: number; refined_starch?: number; fibre?: number; alcohol?: number
      upf?: number
    }
    const dayMap = new Map<number, DayRow>()

    for (const r of readings) {
      if (cutoff && new Date(r.recorded_at) < cutoff) continue
      const hasAny = r.weight_kg != null || r.waist_cm != null || r.calories != null || r.steps != null ||
        r.sugar_g != null || r.refined_starch_g != null || r.fibre_g != null || r.alcohol_units != null
      if (!hasAny) continue
      const day = new Date(r.recorded_at)
      day.setHours(0, 0, 0, 0)
      const ts = day.getTime()
      const existing: DayRow = dayMap.get(ts) ?? { label: format(day, 'dd MMM yyyy') }
      if (r.weight_kg != null) existing.weight = Number(r.weight_kg)
      if (r.waist_cm != null) existing.waist = Number(r.waist_cm)
      if (r.calories != null) existing.calories = Number(r.calories)
      if (r.steps != null) existing.steps = Number(r.steps)
      if (r.sugar_g != null) existing.sugar = Number(r.sugar_g)
      if (r.refined_starch_g != null) existing.refined_starch = Number(r.refined_starch_g)
      if (r.fibre_g != null) existing.fibre = Number(r.fibre_g)
      if (r.alcohol_units != null) existing.alcohol = Number(r.alcohol_units)
      if (r.ultra_processed_score != null) existing.upf = Number(r.ultra_processed_score)
      dayMap.set(ts, existing)
    }

    const sorted = [...dayMap.entries()].sort((a, b) => a[0] - b[0])
    const rows = sorted.map(([, d]) => d)

    return {
      timeline: sorted.map(([ts]) => ({ label: format(new Date(ts), 'dd MMM'), timestamp: ts })),
      tableData: rows,
      hasWaist: rows.some(r => r.waist !== undefined),
      hasSugar: rows.some(r => r.sugar !== undefined),
      hasStarch: rows.some(r => r.refined_starch !== undefined),
      hasFibre: rows.some(r => r.fibre !== undefined),
      hasAlcohol: rows.some(r => r.alcohol !== undefined),
    }
  }, [readings, range])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Metabolic Drivers</h1>
          <p className="text-[10px] text-gray-500">Pressure inputs and body responses over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#1e3029] rounded-lg p-0.5">
            <button
              onClick={() => setView('graph')}
              className={`p-1.5 rounded-md transition-colors ${view === 'graph' ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
          <RangeButtons range={range} setRange={setRange} />
        </div>
      </div>

      {view === 'graph' ? (
        <>
          {/* Metabolic Pressure inputs */}
          <div>
            <p className="text-[10px] font-bold text-[#f59e0b] uppercase tracking-wider mb-2 px-1">Metabolic Pressure</p>
            <div className="space-y-3">
              {hasSugar && <SingleMetricChart readings={readings} metric="sugar" timeline={timeline} />}
              {hasStarch && <SingleMetricChart readings={readings} metric="refined_starch" timeline={timeline} />}
              {hasAlcohol && <SingleMetricChart readings={readings} metric="alcohol" timeline={timeline} />}
              {hasFibre && <SingleMetricChart readings={readings} metric="fibre" timeline={timeline} />}
            </div>
          </div>

          {/* Metabolic Response */}
          <div>
            <p className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-2 px-1">Metabolic Response</p>
            <div className="space-y-3">
              <SingleMetricChart readings={readings} metric="weight" timeline={timeline} />
              {hasWaist && <SingleMetricChart readings={readings} metric="waist" timeline={timeline} />}
              <SingleMetricChart readings={readings} metric="calories" timeline={timeline} />
              <SingleMetricChart readings={readings} metric="steps" timeline={timeline} />
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          {tableData.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-8">No data for this period</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left border-b border-[#1e3029]">
                    <th className="py-2 pr-3 font-semibold text-gray-500">Date</th>
                    <th className="py-2 pr-3 font-semibold text-brand-green">Wt (kg)</th>
                    {hasWaist && <th className="py-2 pr-3 font-semibold text-[#2dd4bf]">Waist</th>}
                    {hasSugar && <th className="py-2 pr-3 font-semibold text-[#f59e0b]">Sugar</th>}
                    {hasStarch && <th className="py-2 pr-3 font-semibold text-[#ef4444]">Starch</th>}
                    {hasFibre && <th className="py-2 pr-3 font-semibold text-[#34d399]">Fibre</th>}
                    {hasAlcohol && <th className="py-2 pr-3 font-semibold text-[#a78bfa]">Alc</th>}
                    <th className="py-2 font-semibold text-[#8b5cf6]">UPF</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tableData].reverse().map((row, i) => (
                    <tr key={i} className="border-b border-[#1e3029] last:border-0">
                      <td className="py-2 pr-3 text-gray-400">{row.label}</td>
                      <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.weight?.toFixed(1) ?? '—'}</td>
                      {hasWaist && <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.waist?.toFixed(1) ?? '—'}</td>}
                      {hasSugar && <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.sugar?.toFixed(1) ?? '—'}</td>}
                      {hasStarch && <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.refined_starch?.toFixed(1) ?? '—'}</td>}
                      {hasFibre && <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.fibre?.toFixed(1) ?? '—'}</td>}
                      {hasAlcohol && <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.alcohol?.toFixed(1) ?? '—'}</td>}
                      <td className="py-2 text-gray-200">
                        {row.upf !== undefined ? UPF_LABELS[row.upf] ?? '—' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
