import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReadingForm, { type ReadingFormData, type NutritionFill } from '../components/ReadingForm'
import BloodPanelForm, { type BloodPanelFormData } from '../components/BloodPanelForm'
import { useReadings } from '../hooks/useReadings'
import { useBloodPanels } from '../hooks/useBloodPanels'
import { supabase } from '../lib/supabase'
import { CheckCircle, TestTubes, X, Sparkles, ChevronRight } from 'lucide-react'

type NutritionResult = NutritionFill & { _raw: string }

export default function AddReading() {
  const { readings, loading, addReading, updateReading } = useReadings()
  const { addPanel } = useBloodPanels()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [showPanelModal, setShowPanelModal] = useState(false)
  const [panelSaved, setPanelSaved] = useState(false)

  // AI food logging state
  const [foodText, setFoodText] = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null)
  const [nutritionError, setNutritionError] = useState<string | null>(null)
  const [appliedFill, setAppliedFill] = useState<NutritionFill | null>(null)

  const todayReading = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    return readings.find(r => {
      const d = new Date(r.recorded_at)
      return d >= startOfToday && d <= endOfToday
    }) ?? null
  }, [readings])

  const initialValues = useMemo(() => {
    if (!todayReading) return undefined
    return {
      recorded_at: todayReading.recorded_at,
      systolic: todayReading.systolic,
      diastolic: todayReading.diastolic,
      pulse: todayReading.pulse,
      weight_kg: todayReading.weight_kg ? Number(todayReading.weight_kg) : null,
      mounjaro_dose_mg: todayReading.mounjaro_dose_mg ? Number(todayReading.mounjaro_dose_mg) : null,
      glucose_mmol: todayReading.glucose_mmol ? Number(todayReading.glucose_mmol) : null,
      sleep_hours: todayReading.sleep_hours ? Number(todayReading.sleep_hours) : null,
      steps: todayReading.steps,
      calories: todayReading.calories,
      protein_g: todayReading.protein_g ? Number(todayReading.protein_g) : null,
      fat_g: todayReading.fat_g ? Number(todayReading.fat_g) : null,
      carbs_g: todayReading.carbs_g ? Number(todayReading.carbs_g) : null,
      sugar_g: todayReading.sugar_g ? Number(todayReading.sugar_g) : null,
      notes: todayReading.notes,
    }
  }, [todayReading])

  const handleSubmit = async (data: ReadingFormData) => {
    const isUpdate = !!todayReading
    const result = isUpdate
      ? await updateReading(todayReading!.id, data)
      : await addReading(data)
    if (!result.error) {
      if (isUpdate) {
        navigate('/dashboard')
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    }
    return result
  }

  const handlePanelSubmit = async (data: BloodPanelFormData) => {
    const result = await addPanel(data)
    if (!result.error) {
      setShowPanelModal(false)
      setPanelSaved(true)
      setTimeout(() => setPanelSaved(false), 2500)
    }
    return result
  }

  const analyseFood = async () => {
    if (!foodText.trim()) return
    setAnalysing(true)
    setNutritionError(null)
    setNutritionResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ description: foodText.trim() }),
        }
      )
      if (!res.ok) throw new Error('Analysis failed')
      const data = await res.json()
      setNutritionResult({ ...data, _raw: foodText.trim() })
    } catch {
      setNutritionError('Could not analyse food. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }

  const applyNutrition = () => {
    if (!nutritionResult) return
    setAppliedFill({
      calories: nutritionResult.calories,
      protein_g: nutritionResult.protein_g,
      fat_g: nutritionResult.fat_g,
      carbs_g: nutritionResult.carbs_g,
      sugar_g: nutritionResult.sugar_g,
    })
    setNutritionResult(null)
    setFoodText('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Today's Reading</h1>

      {saved && (
        <div className="flex items-center gap-2 bg-brand-green/10 border border-brand-green/30 text-brand-green text-sm rounded-xl px-4 py-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>Reading saved</span>
        </div>
      )}

      {/* AI food logging card */}
      <div className="card border-l-4 border-l-[#7c3aed] space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#a78bfa]" />
          <p className="text-sm font-semibold text-gray-300">Log food with AI</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Tell the AI what you ate and it will estimate your calories and macros.
        </p>

        <input
          type="text"
          className="input-field text-sm"
          placeholder="e.g. scrambled eggs, toast and orange juice"
          value={foodText}
          onChange={e => setFoodText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') analyseFood() }}
        />

        {foodText.trim() && !listening && (
          <button
            type="button"
            onClick={analyseFood}
            disabled={analysing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2a1e3d] text-[#a78bfa] text-sm font-medium hover:bg-[#3b2959] transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {analysing ? 'Analysing...' : 'Analyse with AI'}
          </button>
        )}

        {nutritionError && (
          <p className="text-xs text-red-400">{nutritionError}</p>
        )}

        {nutritionResult && (
          <div className="bg-[#1a2820] rounded-xl p-3 space-y-3">
            <p className="text-xs text-gray-400 italic truncate">"{nutritionResult._raw}"</p>
            <div className="grid grid-cols-5 gap-1 text-center">
              {[
                { label: 'Cal', value: nutritionResult.calories, unit: '' },
                { label: 'Protein', value: nutritionResult.protein_g, unit: 'g' },
                { label: 'Fat', value: nutritionResult.fat_g, unit: 'g' },
                { label: 'Carbs', value: nutritionResult.carbs_g, unit: 'g' },
                { label: 'Sugar', value: nutritionResult.sugar_g, unit: 'g' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="bg-[#0f1d17] rounded-lg py-2 px-1">
                  <p className="text-xs font-bold text-gray-100">{value}{unit}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={applyNutrition}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-green/10 text-brand-green text-sm font-medium hover:bg-brand-green/20 transition-colors"
            >
              Apply to today's log
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <ReadingForm
        key={todayReading?.id ?? 'new'}
        onSubmit={handleSubmit}
        initialValues={initialValues}
        nutritionFill={appliedFill}
        bpOptional
        submitLabel={todayReading ? 'Update Today' : 'Save Today'}
        afterBP={
          <div className="card border-l-4 border-l-brand-green space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-300">Blood Test</p>
                {panelSaved ? (
                  <p className="text-xs text-brand-green mt-0.5">Saved successfully</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">Log your latest results</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPanelModal(true)}
                className="btn-primary flex items-center gap-2 !py-2.5 !px-4 text-sm"
              >
                <TestTubes className="w-4 h-4" />
                Add Blood Test
              </button>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Blood pressure, weight, sleep, medication, and blood tests each tell part of the story. BioMetRx combines them to help you understand what is driving your health improvements and where to focus next.
            </p>
          </div>
        }
      />

      {showPanelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowPanelModal(false)}>
          <div className="bg-[#131f1b] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-100">Add Blood Panel</h3>
              <button onClick={() => setShowPanelModal(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <BloodPanelForm onSubmit={handlePanelSubmit} />
          </div>
        </div>
      )}
    </div>
  )
}
