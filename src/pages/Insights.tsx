import { useReadings } from '../hooks/useReadings'
import InsightCard from '../components/InsightCard'
import { generateInsights } from '../utils/calculations'
import { ShieldAlert } from 'lucide-react'

export default function Insights() {
  const { readings, loading } = useReadings()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const insights = generateInsights(readings)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Insights</h1>

      <div className="space-y-3">
        {insights.map((insight, i) => (
          <InsightCard key={i} insight={insight} />
        ))}
      </div>

      <div className="card flex gap-3 bg-[#0f1a16] border-[#1e3029]">
        <ShieldAlert className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong>Disclaimer:</strong> This app does not provide medical advice.
          Insights are based on simple rules applied to your data and are not a
          substitute for professional medical guidance. Always consult your GP
          or healthcare provider about your health.
        </p>
      </div>
    </div>
  )
}
