import { useState } from 'react'
import type { HealthScoreResult } from '../utils/healthScore'

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value === null) return null
  const color = value >= 80 ? '#29ab00' : value >= 60 ? '#FFC20A' : '#DC2626'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-500 w-20 text-right shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[#1e3029] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] text-gray-400 w-6 tabular-nums">{value}</span>
    </div>
  )
}

export default function BiometrxAgeCard({ result, chronologicalAge }: {
  result: HealthScoreResult
  chronologicalAge: number | null
}) {
  const [expanded, setExpanded] = useState(false)
  const { score, biometrxAge, ageAdjustment, breakdown, availableFactors, totalFactors, potential } = result

  if (score === null) {
    return (
      <div className="card">
        <h3 className="text-sm font-bold text-gray-200 mb-2">BioMetRx Age</h3>
        <p className="text-xs text-gray-500">
          Add BP readings and blood panel results to calculate your BioMetRx Age.
        </p>
      </div>
    )
  }

  const scoreColor = score >= 80 ? 'text-brand-green' : score >= 60 ? 'text-warning' : 'text-red-400'
  const adjColor = ageAdjustment !== null && ageAdjustment <= 0 ? 'text-brand-green' : 'text-warning'
  const adjLabel = ageAdjustment !== null
    ? (ageAdjustment <= 0 ? `${ageAdjustment} yrs` : `+${ageAdjustment} yrs`)
    : null

  return (
    <div className="space-y-2">
      {/* Main row: BioMetRx Age + Max Potential Age side by side */}
      <div className="grid grid-cols-2 gap-2">

        {/* BioMetRx Age card */}
        <div className="card cursor-pointer" onDoubleClick={() => setExpanded(!expanded)}>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">BioMetRx Age</h3>
          <div className="flex flex-col items-center gap-1">
            <p className={`text-3xl font-bold tabular-nums ${scoreColor}`}>
              {biometrxAge ?? '—'}
            </p>
            <p className="text-[10px] text-gray-500">
              Score {score} · {adjLabel ?? '—'}
            </p>
          </div>
          <p className="text-[9px] text-gray-600 text-center mt-2">Double-tap for detail</p>
        </div>

        {/* Max Potential Age card */}
        <div className="card cursor-pointer" onDoubleClick={() => setExpanded(!expanded)}>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Max Potential Age</h3>
          {potential && potential.potentialAge !== null ? (
            <div className="flex flex-col items-center gap-1">
              <p className="text-3xl font-bold tabular-nums text-brand-green">
                {potential.potentialAge}
              </p>
              {potential.recoverableYears !== null && potential.recoverableYears > 0 ? (
                <p className="text-[10px] text-brand-green font-semibold">
                  {potential.recoverableYears} yrs recoverable
                </p>
              ) : (
                <p className="text-[10px] text-gray-500">At optimal</p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <p className="text-lg text-gray-500">—</p>
              <p className="text-[10px] text-gray-500">Set DOB in profile</p>
            </div>
          )}
          <p className="text-[9px] text-gray-600 text-center mt-2">Double-tap for detail</p>
        </div>

      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="card space-y-4">
          {/* Score breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-gray-300">Score Breakdown</h4>
              <span className="text-[10px] text-gray-500">{availableFactors}/{totalFactors} factors</span>
            </div>
            {chronologicalAge !== null && (
              <p className="text-[10px] text-gray-500 mb-2">Chronological age: {chronologicalAge}</p>
            )}
            <div className="space-y-1.5">
              <ScoreBar label="BP" value={breakdown.bp} />
              <ScoreBar label="HbA1c" value={breakdown.hba1c} />
              <ScoreBar label="Fasting Insulin" value={breakdown.fastingInsulin} />
              <ScoreBar label="Triglycerides" value={breakdown.triglycerides} />
              <ScoreBar label="HDL" value={breakdown.hdl} />
              <ScoreBar label="LDL" value={breakdown.ldl} />
              <ScoreBar label="ALT" value={breakdown.alt} />
              <ScoreBar label="GGT" value={breakdown.ggt} />
              <ScoreBar label="Uric Acid" value={breakdown.uricAcid} />
              <ScoreBar label="Waist" value={breakdown.waist} />
              <ScoreBar label="Kidney" value={breakdown.kidney} />
              <ScoreBar label="Testosterone" value={breakdown.testosterone} />
            </div>
          </div>

          {/* Opportunities */}
          {potential && potential.opportunities.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-300 mb-2">Primary Opportunities</h4>
              <ul className="space-y-1">
                {potential.opportunities.map(o => (
                  <li key={o.factor} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-green shrink-0" />
                    <span className="text-gray-400">
                      {o.currentScore >= 80 ? 'Maintain' : 'Improve'} {o.factor}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Helper text */}
          <p className="text-[10px] text-gray-600 leading-relaxed">
            Max Potential Age shows the health age you could achieve if your current modifiable health markers reached healthy target ranges. It is intended as a motivational goal and not a medical prediction.
          </p>

          <button
            onClick={() => setExpanded(false)}
            className="w-full text-center text-[10px] text-gray-500 hover:text-gray-300 py-1"
          >
            Double-tap to close
          </button>
        </div>
      )}
    </div>
  )
}
