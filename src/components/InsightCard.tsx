import { CheckCircle, AlertTriangle, Info, AlertOctagon } from 'lucide-react'
import type { Insight } from '../types'

const config = {
  positive: {
    icon: CheckCircle,
    bg: 'bg-brand-green/10 border-brand-green/20',
    iconColor: 'text-brand-green',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning/10 border-warning/20',
    iconColor: 'text-warning',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500/10 border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  severe: {
    icon: AlertOctagon,
    bg: 'bg-red-500/10 border-red-500/20',
    iconColor: 'text-red-400',
  },
}

export default function InsightCard({ insight }: { insight: Insight }) {
  const { icon: Icon, bg, iconColor } = config[insight.type]

  return (
    <div className={`card border ${bg} flex gap-3`}>
      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
      <div>
        <p className="font-semibold text-sm text-gray-200">{insight.title}</p>
        <p className="text-sm text-gray-400 mt-0.5">{insight.message}</p>
      </div>
    </div>
  )
}
