import { useState, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import type { HealthReading } from '../types'

interface BPChartProps {
  readings: HealthReading[]
  dataKey?: 'bp' | 'pulse' | 'map'
}

type ChartRange = '7' | '30' | '90' | 'all'

interface ChartPoint {
  date: string
  systolic?: number
  diastolic?: number
  pulse?: number
  map?: number
}

export default function BPChart({ readings, dataKey = 'bp' }: BPChartProps) {
  const [range, setRange] = useState<ChartRange>('30')

  const { data, avgSys, avgDia } = useMemo(() => {
    const cutoff = range === 'all' ? null : subDays(new Date(), parseInt(range))
    const filtered = [...readings]
      .filter(r => {
        if (cutoff && new Date(r.recorded_at) < cutoff) return false
        if (dataKey === 'bp' && (r.systolic == null || r.diastolic == null)) return false
        if (dataKey === 'pulse' && r.pulse == null) return false
        if (dataKey === 'map' && r.map == null) return false
        return true
      })
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    const points: ChartPoint[] = filtered.map(r => ({
      date: format(new Date(r.recorded_at), 'dd MMM'),
      systolic: r.systolic ?? undefined,
      diastolic: r.diastolic ?? undefined,
      pulse: r.pulse ?? undefined,
      map: r.map != null ? Number(r.map) : undefined,
    }))

    const bpR = filtered.filter(r => r.systolic != null && r.diastolic != null)
    const aS = bpR.length > 0 ? Math.round(bpR.reduce((s, r) => s + r.systolic!, 0) / bpR.length) : null
    const aD = bpR.length > 0 ? Math.round(bpR.reduce((s, r) => s + r.diastolic!, 0) / bpR.length) : null

    return { data: points, avgSys: aS, avgDia: aD }
  }, [readings, range, dataKey])

  const title = dataKey === 'bp' ? 'Blood Pressure Trend' : dataKey === 'pulse' ? 'Pulse Trend' : 'MAP Trend'
  const rangeLabel = range === 'all' ? 'Avg' : `${range} Day Avg`

  if (readings.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data yet</div>
  }

  // Compute SVG chart manually — Recharts has issues rendering lines with few data points
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-200">{title}</h3>
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
      {dataKey === 'bp' && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-brand-green inline-block" /> Systolic
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6366f1] inline-block" /> Diastolic
            </span>
          </div>
          {avgSys !== null && avgDia !== null && (
            <div className="flex gap-3">
              <div className="text-right">
                <span className="text-lg font-bold text-brand-green tabular-nums">{avgSys}</span>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider">{rangeLabel} Systolic</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-[#6366f1] tabular-nums">{avgDia}</span>
                <p className="text-[9px] text-gray-500 uppercase tracking-wider">{rangeLabel} Diastolic</p>
              </div>
            </div>
          )}
        </div>
      )}
      <SVGChart data={data} dataKey={dataKey} avgSys={avgSys} avgDia={avgDia} />
    </div>
  )
}

/** Lightweight SVG line chart that reliably renders even with 1-2 data points */
function SVGChart({ data, dataKey, avgSys, avgDia }: {
  data: ChartPoint[]
  dataKey: 'bp' | 'pulse' | 'map'
  avgSys: number | null
  avgDia: number | null
}) {
  const W = 500
  const H = 180
  const PAD = { top: 15, right: 15, bottom: 25, left: 45 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  if (data.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data for this range</div>
  }

  // Gather all numeric values to compute Y range
  const allValues: number[] = []
  for (const d of data) {
    if (dataKey === 'bp') {
      if (d.systolic !== undefined) allValues.push(d.systolic)
      if (d.diastolic !== undefined) allValues.push(d.diastolic)
    } else if (dataKey === 'pulse' && d.pulse !== undefined) {
      allValues.push(d.pulse)
    } else if (dataKey === 'map' && d.map !== undefined) {
      allValues.push(d.map)
    }
  }

  if (allValues.length === 0) {
    return <div className="text-sm text-gray-500 text-center py-8">No data for this range</div>
  }

  const yMin = Math.floor(Math.min(...allValues) - 10)
  const yMax = Math.ceil(Math.max(...allValues) + 10)
  const yRange = yMax - yMin || 1

  const toX = (i: number) => PAD.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  const toY = (v: number) => PAD.top + chartH - ((v - yMin) / yRange) * chartH

  // Build line paths
  function buildLine(key: keyof ChartPoint): { path: string; dots: { x: number; y: number; v: number }[] } {
    const dots: { x: number; y: number; v: number }[] = []
    const segments: string[] = []
    data.forEach((d, i) => {
      const v = d[key]
      if (v === undefined || typeof v !== 'number') return
      const x = toX(i)
      const y = toY(v)
      dots.push({ x, y, v })
      segments.push(`${segments.length === 0 ? 'M' : 'L'}${x},${y}`)
    })
    return { path: segments.join(' '), dots }
  }

  // Y-axis ticks
  const tickCount = 5
  const yTicks: number[] = []
  for (let i = 0; i <= tickCount; i++) {
    yTicks.push(Math.round(yMin + (yRange * i) / tickCount))
  }

  // Grid lines
  const gridLines = yTicks.map(v => toY(v))

  const lines: { key: keyof ChartPoint; color: string }[] =
    dataKey === 'bp'
      ? [{ key: 'systolic', color: '#29ab00' }, { key: 'diastolic', color: '#6366f1' }]
      : dataKey === 'pulse'
        ? [{ key: 'pulse', color: '#f97316' }]
        : [{ key: 'map', color: '#8b5cf6' }]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* Grid */}
      {gridLines.map((y, i) => (
        <g key={i}>
          <line x1={PAD.left} x2={W - PAD.right} y1={y} y2={y} stroke="#1e3029" strokeDasharray="3 3" />
          <text x={PAD.left - 8} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="10">{yTicks[i]}</text>
        </g>
      ))}

      {/* Average reference lines */}
      {dataKey === 'bp' && avgSys !== null && (
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(avgSys)} y2={toY(avgSys)} stroke="#29ab00" strokeDasharray="4 4" strokeOpacity="0.4" />
      )}
      {dataKey === 'bp' && avgDia !== null && (
        <line x1={PAD.left} x2={W - PAD.right} y1={toY(avgDia)} y2={toY(avgDia)} stroke="#6366f1" strokeDasharray="4 4" strokeOpacity="0.4" />
      )}

      {/* Lines and dots */}
      {lines.map(({ key, color }) => {
        const { path, dots } = buildLine(key)
        return (
          <g key={key}>
            {path && <path d={path} fill="none" stroke={color} strokeWidth="2" />}
            {dots.map((dot, i) => (
              <circle key={i} cx={dot.x} cy={dot.y} r="4" fill={color} />
            ))}
          </g>
        )
      })}

      {/* X-axis labels */}
      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize="10">{d.date}</text>
      ))}
    </svg>
  )
}
