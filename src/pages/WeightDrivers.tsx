import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subDays } from 'date-fns'
import { useReadings } from '../hooks/useReadings'
import { ArrowLeft, BarChart3, Table } from 'lucide-react'
import type { HealthReading } from '../types'

type ViewMode = 'graph' | 'table'

type ChartRange = '7' | '30' | '90' | 'all'

function RangeButtons({ range, setRange }: { range: ChartRange; setRange: (r: ChartRange) => void }) {
  return (
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
  )
}

interface TimelineDate {
  label: string
  timestamp: number
}

function SingleMetricChart({ readings, range, metric, timeline }: {
  readings: HealthReading[]
  range: ChartRange
  metric: 'weight' | 'calories' | 'steps'
  timeline: TimelineDate[]
}) {
  const config = {
    weight: { label: 'Weight', unit: 'kg', color: '#29ab00', extract: (r: HealthReading) => r.weight_kg != null ? Number(r.weight_kg) : null, decimals: 1 },
    calories: { label: 'Calories', unit: 'kcal', color: '#8b5cf6', extract: (r: HealthReading) => r.calories != null ? Number(r.calories) : null, decimals: 0 },
    steps: { label: 'Steps', unit: 'steps', color: '#f97316', extract: (r: HealthReading) => r.steps != null ? Number(r.steps) : null, decimals: 0 },
  }

  const { label, unit, color, extract, decimals } = config[metric]

  // Build a map from timestamp to value for this metric
  const valueMap = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    const map = new Map<number, number>()
    for (const r of readings) {
      if (cutoff && new Date(r.recorded_at) < cutoff) continue
      const v = extract(r)
      if (v === null) continue
      // Round to day for matching
      const day = new Date(r.recorded_at)
      day.setHours(0, 0, 0, 0)
      map.set(day.getTime(), v)
    }
    return map
  }, [readings, range, extract])

  // Get values aligned to timeline
  const points = timeline.map(t => ({ date: t.label, value: valueMap.get(t.timestamp) }))
  const withValues = points.filter(p => p.value !== undefined) as { date: string; value: number }[]

  if (withValues.length === 0) {
    return (
      <div className="card">
        <h3 className="text-sm font-bold text-gray-200 mb-2">{label}</h3>
        <p className="text-xs text-gray-500 text-center py-6">No {label.toLowerCase()} data for this period</p>
      </div>
    )
  }

  const first = withValues[0]!.value
  const last = withValues[withValues.length - 1]!.value
  const delta = last - first
  const avg = withValues.reduce((s, d) => s + d.value, 0) / withValues.length

  // SVG chart — x positions use the shared timeline
  const W = 500, H = 160
  const PAD = { top: 10, right: 15, bottom: 25, left: 45 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const vals = withValues.map(d => d.value)
  const spread = Math.max(...vals) - Math.min(...vals)
  const yMin = Math.floor(Math.min(...vals) - (spread * 0.15 || 1))
  const yMax = Math.ceil(Math.max(...vals) + (spread * 0.15 || 1))
  const yRange = yMax - yMin || 1

  const toX = (timelineIdx: number) => PAD.left + (timeline.length === 1 ? chartW / 2 : (timelineIdx / (timeline.length - 1)) * chartW)
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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-sm font-bold" style={{ color }}>{label}</h3>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold tabular-nums text-gray-100">
            {decimals > 0 ? last.toFixed(decimals) : last.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500 ml-1">{unit}</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="flex gap-4 mb-2">
        <div>
          <p className="text-[9px] text-gray-500 uppercase">Change</p>
          <p className={`text-xs font-bold tabular-nums ${
            metric === 'weight' ? (delta <= 0 ? 'text-brand-green' : 'text-warning') :
            (delta >= 0 ? 'text-brand-green' : 'text-warning')
          }`}>
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

        {/* Start reference line */}
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(first)} y2={toY(first)} stroke="#374151" strokeDasharray="4 4" />

        {/* Line + dots */}
        {segs.length > 0 && <path d={segs.join(' ')} fill="none" stroke={color} strokeWidth="2" />}
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r="4" fill={color} />
        ))}

        {/* X labels — shared timeline */}
        {timeline.map((t, i) => (
          <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="10">{t.label}</text>
        ))}
      </svg>
    </div>
  )
}

export default function WeightDrivers() {
  const { readings, loading } = useReadings()
  const navigate = useNavigate()
  const [range, setRange] = useState<ChartRange>('30')
  const [view, setView] = useState<ViewMode>('graph')

  // Compute a shared timeline: union of all unique days that have any data
  const { timeline, tableData } = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    const dayMap = new Map<number, { label: string; weight?: number; calories?: number; steps?: number }>()

    for (const r of readings) {
      if (cutoff && new Date(r.recorded_at) < cutoff) continue
      if (r.weight_kg == null && r.calories == null && r.steps == null) continue
      const day = new Date(r.recorded_at)
      day.setHours(0, 0, 0, 0)
      const ts = day.getTime()
      const existing = dayMap.get(ts) ?? { label: format(day, 'dd MMM yyyy') }
      if (r.weight_kg != null) existing.weight = Number(r.weight_kg)
      if (r.calories != null) existing.calories = Number(r.calories)
      if (r.steps != null) existing.steps = Number(r.steps)
      dayMap.set(ts, existing)
    }

    const sorted = [...dayMap.entries()].sort((a, b) => a[0] - b[0])

    return {
      timeline: sorted.map(([timestamp, d]) => ({ label: format(new Date(timestamp), 'dd MMM'), timestamp })),
      tableData: sorted.map(([, d]) => d),
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
          <h1 className="text-xl font-bold">Weight Drivers</h1>
          <p className="text-[10px] text-gray-500">Actual values for each metric</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#1e3029] rounded-lg p-0.5">
            <button
              onClick={() => setView('graph')}
              className={`p-1.5 rounded-md transition-colors ${view === 'graph' ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Graph view"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-brand-green text-white' : 'text-gray-500 hover:text-gray-300'}`}
              title="Table view"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
          <RangeButtons range={range} setRange={setRange} />
        </div>
      </div>

      {view === 'graph' ? (
        <>
          <SingleMetricChart readings={readings} range={range} metric="weight" timeline={timeline} />
          <SingleMetricChart readings={readings} range={range} metric="calories" timeline={timeline} />
          <SingleMetricChart readings={readings} range={range} metric="steps" timeline={timeline} />
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
                    <th className="py-2 pr-3 font-semibold text-brand-green">Weight (kg)</th>
                    <th className="py-2 pr-3 font-semibold text-[#8b5cf6]">Calories</th>
                    <th className="py-2 font-semibold text-[#f97316]">Steps</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tableData].reverse().map((row, i) => (
                    <tr key={i} className="border-b border-[#1e3029] last:border-0">
                      <td className="py-2 pr-3 text-gray-400">{row.label}</td>
                      <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.weight?.toFixed(1) ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-200 tabular-nums">{row.calories?.toLocaleString() ?? '—'}</td>
                      <td className="py-2 text-gray-200 tabular-nums">{row.steps?.toLocaleString() ?? '—'}</td>
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
