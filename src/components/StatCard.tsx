import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number | null
  unit?: string
  trend?: 'up' | 'down' | 'flat' | null
  accent?: 'green' | 'warning' | 'severe' | 'default'
  icon?: LucideIcon
  subtitle?: string
}

const accentIconBg = {
  green: 'bg-brand-green/15 text-brand-green',
  warning: 'bg-warning/15 text-warning',
  severe: 'bg-red-500/15 text-red-400',
  default: 'bg-[#1e3029] text-gray-400',
}

/** Hero stat card — used in the top 4-up row with icon */
export function HeroStatCard({ label, value, unit, icon: Icon, accent = 'default' }: StatCardProps) {
  return (
    <div className="card flex flex-col items-center text-center gap-2 py-4">
      {Icon && (
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${accentIconBg[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
      )}
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider leading-tight">{label}</p>
      <div>
        <span className="text-xl font-bold tabular-nums text-gray-100">
          {value ?? '—'}
        </span>
        {unit && value !== null && (
          <span className="text-[11px] text-gray-500 ml-1">{unit}</span>
        )}
      </div>
    </div>
  )
}

/** Compact metric card — used in the second/third rows */
export default function StatCard({ label, value, unit, trend, accent = 'default', subtitle }: StatCardProps) {
  return (
    <div className="card-sm">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-bold tabular-nums text-gray-100">
          {value ?? '—'}
        </span>
        {unit && value !== null && (
          <span className="text-[11px] text-gray-500">{unit}</span>
        )}
        {trend && (
          <span className={`text-xs font-semibold ml-auto ${
            trend === 'down' ? 'text-brand-green' :
            trend === 'up' ? 'text-warning' :
            'text-gray-500'
          }`}>
            {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '→'}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  )
}
