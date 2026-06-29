import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { HeartPulse, X, Check } from 'lucide-react'
import { useHealthConnect } from '../hooks/useHealthConnect'

export interface NutritionFill {
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  sugar_g: number | null
  alcohol_units: number | null
}

interface ReadingFormProps {
  onSubmit: (data: ReadingFormData) => Promise<{ error: unknown }>
  initialValues?: Partial<ReadingFormData>
  nutritionFill?: NutritionFill | null
  submitLabel?: string
  bpOptional?: boolean
  afterBP?: React.ReactNode
}

export interface ReadingFormData {
  recorded_at: string
  systolic: number | null
  diastolic: number | null
  pulse: number | null
  weight_kg: number | null
  mounjaro_dose_mg: number | null
  glucose_mmol: number | null
  sleep_hours: number | null
  steps: number | null
  calories: number | null
  protein_g: number | null
  fat_g: number | null
  carbs_g: number | null
  sugar_g: number | null
  fibre_g: number | null
  refined_starch_g: number | null
  alcohol_units: number | null
  waist_cm: number | null
  ultra_processed_score: number | null
  hrv_ms?: number | null
  sleep_deep_min?: number | null
  sleep_rem_min?: number | null
  vo2_max?: number | null
  notes: string | null
}

interface BPReading {
  systolic: string
  diastolic: string
  pulse: string
}

const emptyBPReading = (): BPReading => ({ systolic: '', diastolic: '', pulse: '' })

function toLocalDatetime(isoStr?: string): string {
  if (!isoStr) return format(new Date(), "yyyy-MM-dd'T'HH:mm")
  return format(new Date(isoStr), "yyyy-MM-dd'T'HH:mm")
}

function BPModal({ onConfirm, onClose }: {
  onConfirm: (systolic: number, diastolic: number, pulse: number | null) => void
  onClose: () => void
}) {
  const [readings, setReadings] = useState<[BPReading, BPReading, BPReading]>([
    emptyBPReading(), emptyBPReading(), emptyBPReading(),
  ])
  const [modalError, setModalError] = useState<string | null>(null)

  const updateReading = (index: number, field: keyof BPReading, value: string) => {
    setReadings(prev => {
      const next = [...prev] as [BPReading, BPReading, BPReading]
      next[index] = { ...next[index]!, [field]: value }
      return next
    })
  }

  const handleConfirm = () => {
    // Validate that at least readings 2 and 3 are filled
    const r2 = readings[1]!
    const r3 = readings[2]!
    const sys2 = parseInt(r2.systolic)
    const dia2 = parseInt(r2.diastolic)
    const sys3 = parseInt(r3.systolic)
    const dia3 = parseInt(r3.diastolic)

    if (!sys2 || !dia2 || !sys3 || !dia3) {
      setModalError('Please complete at least readings 2 and 3.')
      return
    }

    // Average of last 2 readings
    const avgSys = Math.round((sys2 + sys3) / 2)
    const avgDia = Math.round((dia2 + dia3) / 2)

    const pulse2 = parseInt(r2.pulse) || null
    const pulse3 = parseInt(r3.pulse) || null
    const avgPulse = pulse2 && pulse3
      ? Math.round((pulse2 + pulse3) / 2)
      : pulse2 ?? pulse3

    onConfirm(avgSys, avgDia, avgPulse)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#131f1b] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Take Blood Pressure</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-surface-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
            {modalError}
          </div>
        )}

        <div className="space-y-5">
          {readings.map((r, i) => (
            <div key={i}>
              <p className="text-sm font-semibold text-gray-300 mb-2">Reading {i + 1}</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Systolic <span className="text-gray-400">(top)</span></label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    placeholder="120"
                    value={r.systolic}
                    onChange={e => updateReading(i, 'systolic', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Diastolic <span className="text-gray-400">(btm)</span></label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    placeholder="80"
                    value={r.diastolic}
                    onChange={e => updateReading(i, 'diastolic', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Pulse</label>
                  <input
                    type="number"
                    className="input-field text-sm"
                    placeholder="72"
                    value={r.pulse}
                    onChange={e => updateReading(i, 'pulse', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4 mb-4">
          The recorded value will be the average of readings 2 and 3.
        </p>

        <button type="button" onClick={handleConfirm} className="btn-primary w-full flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          Confirm BP
        </button>
      </div>
    </div>
  )
}

export default function ReadingForm({ onSubmit, initialValues, nutritionFill, submitLabel = 'Save Reading', bpOptional = false, afterBP }: ReadingFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showBPModal, setShowBPModal] = useState(false)

  const [recordedAt, setRecordedAt] = useState(toLocalDatetime(initialValues?.recorded_at))
  const [systolic, setSystolic] = useState(initialValues?.systolic?.toString() ?? '')
  const [diastolic, setDiastolic] = useState(initialValues?.diastolic?.toString() ?? '')
  const [pulse, setPulse] = useState(initialValues?.pulse?.toString() ?? '')
  const [weightKg, setWeightKg] = useState(initialValues?.weight_kg?.toString() ?? '')
  const [mounjaroDose, setMounjaroDose] = useState(initialValues?.mounjaro_dose_mg?.toString() ?? '')
  const [glucose, setGlucose] = useState(initialValues?.glucose_mmol?.toString() ?? '')
  const [sleepHours, setSleepHours] = useState(initialValues?.sleep_hours?.toString() ?? '')
  const [steps, setSteps] = useState(initialValues?.steps?.toString() ?? '')
  const [calories, setCalories] = useState(initialValues?.calories?.toString() ?? '')
  const [proteinG, setProteinG] = useState(initialValues?.protein_g?.toString() ?? '')
  const [fatG, setFatG] = useState(initialValues?.fat_g?.toString() ?? '')
  const [carbsG, setCarbsG] = useState(initialValues?.carbs_g?.toString() ?? '')
  const [sugarG, setSugarG] = useState(initialValues?.sugar_g?.toString() ?? '')
  const [fibreG, setFibreG] = useState(initialValues?.fibre_g?.toString() ?? '')
  const [refinedStarchG, setRefinedStarchG] = useState(initialValues?.refined_starch_g?.toString() ?? '')
  const [alcoholUnits, setAlcoholUnits] = useState(initialValues?.alcohol_units?.toString() ?? '')
  const [waistCm, setWaistCm] = useState(initialValues?.waist_cm?.toString() ?? '')
  const [ultraProcessedScore, setUltraProcessedScore] = useState<number | null>(initialValues?.ultra_processed_score ?? null)
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  const { todaySteps } = useHealthConnect()
  const prevFillRef = useRef<NutritionFill | null | undefined>(undefined)

  // Auto-fill steps when Health Connect provides them
  useEffect(() => {
    if (todaySteps !== null && steps === '') {
      setSteps(todaySteps.toString())
    }
  }, [todaySteps])

  // Fill nutrition fields when AI result arrives
  useEffect(() => {
    if (!nutritionFill || nutritionFill === prevFillRef.current) return
    prevFillRef.current = nutritionFill
    if (nutritionFill.calories !== null) setCalories(nutritionFill.calories.toString())
    if (nutritionFill.protein_g !== null) setProteinG(nutritionFill.protein_g.toString())
    if (nutritionFill.fat_g !== null) setFatG(nutritionFill.fat_g.toString())
    if (nutritionFill.carbs_g !== null) setCarbsG(nutritionFill.carbs_g.toString())
    if (nutritionFill.sugar_g !== null) setSugarG(nutritionFill.sugar_g.toString())
    if (nutritionFill.alcohol_units !== null) setAlcoholUnits(nutritionFill.alcohol_units.toString())
    if ('fibre_g' in nutritionFill && nutritionFill.fibre_g !== null) setFibreG((nutritionFill.fibre_g as number).toString())
    if ('refined_starch_g' in nutritionFill && nutritionFill.refined_starch_g !== null) setRefinedStarchG((nutritionFill.refined_starch_g as number).toString())
  }, [nutritionFill])

  const bpTaken = systolic !== '' && diastolic !== ''

  const handleBPConfirm = (avgSys: number, avgDia: number, avgPulse: number | null) => {
    setSystolic(avgSys.toString())
    setDiastolic(avgDia.toString())
    if (avgPulse !== null) setPulse(avgPulse.toString())
    setShowBPModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const sys = systolic ? parseInt(systolic) : null
    const dia = diastolic ? parseInt(diastolic) : null
    const hasBP = sys !== null && dia !== null

    if (!bpOptional && !hasBP) {
      setError('Please take your blood pressure first.')
      return
    }
    if (hasBP && (sys < 60 || sys > 300 || dia < 30 || dia > 200)) {
      setError('Please check your BP values — they seem out of range.')
      return
    }

    setSaving(true)
    const data: ReadingFormData = {
      recorded_at: new Date(recordedAt).toISOString(),
      systolic: sys,
      diastolic: dia,
      pulse: pulse ? parseInt(pulse) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      mounjaro_dose_mg: mounjaroDose ? parseFloat(mounjaroDose) : null,
      glucose_mmol: glucose ? parseFloat(glucose) : null,
      sleep_hours: sleepHours ? parseFloat(sleepHours) : null,
      steps: steps ? parseInt(steps) : null,
      calories: calories ? parseInt(calories) : null,
      protein_g: proteinG ? parseFloat(proteinG) : null,
      fat_g: fatG ? parseFloat(fatG) : null,
      carbs_g: carbsG ? parseFloat(carbsG) : null,
      sugar_g: sugarG ? parseFloat(sugarG) : null,
      fibre_g: fibreG ? parseFloat(fibreG) : null,
      refined_starch_g: refinedStarchG ? parseFloat(refinedStarchG) : null,
      alcohol_units: alcoholUnits ? parseFloat(alcoholUnits) : null,
      waist_cm: waistCm ? parseFloat(waistCm) : null,
      ultra_processed_score: ultraProcessedScore,
      notes: notes.trim() || null,
    }

    const result = await onSubmit(data)
    setSaving(false)
    if (result.error) {
      const msg = result.error instanceof Error
        ? result.error.message
        : (result.error as { message?: string })?.message || 'Unknown error'
      setError(`Failed to save: ${msg}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Date & Time</label>
        <input
          type="datetime-local"
          className="input-field"
          value={recordedAt}
          onChange={e => setRecordedAt(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Weight (kg)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="75.0"
            value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Waist (cm)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="90.0"
            value={waistCm}
            onChange={e => setWaistCm(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Mounjaro (mg)</label>
          <input
            type="number"
            step="0.25"
            className="input-field"
            placeholder="2.5"
            value={mounjaroDose}
            onChange={e => setMounjaroDose(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Alcohol (units)</label>
          <input
            type="number"
            step="0.5"
            className="input-field"
            placeholder="0"
            value={alcoholUnits}
            onChange={e => setAlcoholUnits(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Glucose (mmol/L)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="5.5"
            value={glucose}
            onChange={e => setGlucose(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Sleep (hours)</label>
          <input
            type="number"
            step="0.5"
            className="input-field"
            placeholder="7.5"
            value={sleepHours}
            onChange={e => setSleepHours(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Steps</label>
          <input
            type="number"
            className="input-field"
            placeholder="8000"
            value={steps}
            onChange={e => setSteps(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Calories</label>
          <input
            type="number"
            className="input-field"
            placeholder="2000"
            value={calories}
            onChange={e => setCalories(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Protein (g)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="50"
            value={proteinG}
            onChange={e => setProteinG(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Fat (g)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="70"
            value={fatG}
            onChange={e => setFatG(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Carbs (g)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="200"
            value={carbsG}
            onChange={e => setCarbsG(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Sugar (g)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="40"
            value={sugarG}
            onChange={e => setSugarG(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Fibre (g)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="25"
            value={fibreG}
            onChange={e => setFibreG(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Refined starch (g)</label>
          <input
            type="number"
            step="0.1"
            className="input-field"
            placeholder="0"
            value={refinedStarchG}
            onChange={e => setRefinedStarchG(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Ultra-processed food today</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { score: 0, label: 'None' },
            { score: 1, label: 'A little' },
            { score: 2, label: 'Some' },
            { score: 3, label: 'A lot' },
          ].map(({ score, label }) => (
            <button
              key={score}
              type="button"
              onClick={() => setUltraProcessedScore(ultraProcessedScore === score ? null : score)}
              className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                ultraProcessedScore === score
                  ? score === 0 ? 'bg-brand-green text-white'
                    : score === 1 ? 'bg-yellow-500/80 text-white'
                    : score === 2 ? 'bg-orange-500/80 text-white'
                    : 'bg-red-500/80 text-white'
                  : 'bg-[#1e3029] text-gray-400 hover:bg-[#253d34]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* BP section */}
      <div className="card border-l-4 border-l-brand-green space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-300">Blood Pressure</p>
            {bpTaken ? (
              <p className="text-lg font-bold tabular-nums mt-0.5">
                {systolic}/{diastolic} <span className="text-sm font-normal text-gray-400">mmHg</span>
                {pulse && <span className="ml-2 text-base">{pulse} <span className="text-sm font-normal text-gray-400">bpm</span></span>}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-0.5">Not recorded yet</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowBPModal(true)}
            className="btn-primary flex items-center gap-2 !py-2.5 !px-4 text-sm"
          >
            <HeartPulse className="w-4 h-4" />
            {bpTaken ? 'Retake' : 'Take BP'}
          </button>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Blood pressure can fluctuate, and is affected by recently eating, stress, caffeine, hydration, lack of sleep. So take three readings and enter all three.
        </p>
      </div>

      {showBPModal && (
        <BPModal onConfirm={handleBPConfirm} onClose={() => setShowBPModal(false)} />
      )}

      {afterBP}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Any observations..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <div style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
