import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import ReadingForm, { type ReadingFormData, type NutritionFill } from '../components/ReadingForm'
import BloodPanelForm, { type BloodPanelFormData } from '../components/BloodPanelForm'
import { useReadings } from '../hooks/useReadings'
import { useBloodPanels } from '../hooks/useBloodPanels'
import { useHealthConnect } from '../hooks/useHealthConnect'
import { supabase } from '../lib/supabase'
import { CheckCircle, TestTubes, X, Sparkles, ChevronRight, Camera as CameraIcon } from 'lucide-react'

type NutritionResult = NutritionFill & { _raw: string; _perServing?: NutritionFill }

const PORTION_OPTIONS = [
  { label: '¼', value: 0.25 },
  { label: '⅓', value: 0.33 },
  { label: '½', value: 0.5 },
  { label: '⅔', value: 0.67 },
  { label: '¾', value: 0.75 },
  { label: 'All', value: 1.0 },
]

export default function AddReading() {
  const { readings, loading, addReading, updateReading } = useReadings()
  const { addPanel } = useBloodPanels()
  const { todayHRV, lastNightSleep, latestVO2Max, enabled: hcEnabled } = useHealthConnect()
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
  const [portion, setPortion] = useState(1.0)

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
      fibre_g: todayReading.fibre_g ? Number(todayReading.fibre_g) : null,
      refined_starch_g: todayReading.refined_starch_g ? Number(todayReading.refined_starch_g) : null,
      alcohol_units: todayReading.alcohol_units ? Number(todayReading.alcohol_units) : null,
      waist_cm: todayReading.waist_cm ? Number(todayReading.waist_cm) : null,
      ultra_processed_score: todayReading.ultra_processed_score ?? null,
      notes: todayReading.notes,
    }
  }, [todayReading])

  const handleSubmit = async (data: ReadingFormData) => {
    const isUpdate = !!todayReading
    // Auto-inject passive HC metrics — only override if wearable has data
    const enriched = hcEnabled ? {
      ...data,
      hrv_ms: todayHRV ?? data.hrv_ms ?? null,
      sleep_deep_min: lastNightSleep?.deepMin ?? data.sleep_deep_min ?? null,
      sleep_rem_min: lastNightSleep?.remMin ?? data.sleep_rem_min ?? null,
      vo2_max: latestVO2Max ?? data.vo2_max ?? null,
    } : data
    const result = isUpdate
      ? await updateReading(todayReading!.id, enriched)
      : await addReading(enriched)
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
      setPortion(1.0)
    } catch {
      setNutritionError('Could not analyse food. Please try again.')
    } finally {
      setAnalysing(false)
    }
  }

  const scanLabel = async () => {
    setNutritionError(null)
    setNutritionResult(null)
    try {
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      })
      if (!photo.base64String) return
      setAnalysing(true)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nutrition-ai`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            image_base64: photo.base64String,
            mime_type: `image/${photo.format ?? 'jpeg'}`,
          }),
        }
      )
      if (!res.ok) throw new Error('Label scan failed')
      const data = await res.json()
      // Store per-serving values; display will apply portion multiplier
      setNutritionResult({ ...data, _raw: 'Label scan', _perServing: { ...data } })
      setPortion(1.0)
    } catch (e: unknown) {
      // User cancelled camera — no error needed
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('cancelled') && !msg.includes('cancel') && !msg.includes('dismiss')) {
        setNutritionError('Could not read label. Try again in better light.')
      }
    } finally {
      setAnalysing(false)
    }
  }

  const applyNutrition = () => {
    if (!nutritionResult) return
    // Use per-serving values from label scan, or result values from text, then apply portion
    const serving = nutritionResult._perServing ?? nutritionResult
    const base = appliedFill ?? {
      calories: todayReading?.calories ?? null,
      protein_g: todayReading?.protein_g ? Number(todayReading.protein_g) : null,
      fat_g: todayReading?.fat_g ? Number(todayReading.fat_g) : null,
      carbs_g: todayReading?.carbs_g ? Number(todayReading.carbs_g) : null,
      sugar_g: todayReading?.sugar_g ? Number(todayReading.sugar_g) : null,
      alcohol_units: todayReading?.alcohol_units ? Number(todayReading.alcohol_units) : null,
    }
    setAppliedFill({
      calories: Math.round((base.calories ?? 0) + (serving.calories ?? 0) * portion),
      protein_g: Math.round(((base.protein_g ?? 0) + (serving.protein_g ?? 0) * portion) * 10) / 10,
      fat_g: Math.round(((base.fat_g ?? 0) + (serving.fat_g ?? 0) * portion) * 10) / 10,
      carbs_g: Math.round(((base.carbs_g ?? 0) + (serving.carbs_g ?? 0) * portion) * 10) / 10,
      sugar_g: Math.round(((base.sugar_g ?? 0) + (serving.sugar_g ?? 0) * portion) * 10) / 10,
      alcohol_units: Math.round(((base.alcohol_units ?? 0) + (serving.alcohol_units ?? 0) * portion) * 100) / 100,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#a78bfa]" />
            <p className="text-sm font-semibold text-gray-300">Log food with AI</p>
          </div>
          <button
            type="button"
            onClick={scanLabel}
            disabled={analysing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2a3d] text-[#a78bfa] text-xs font-medium hover:bg-[#2a3550] transition-colors disabled:opacity-50"
          >
            <CameraIcon className="w-3.5 h-3.5" />
            Scan label
          </button>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Tell BioMetRx what food you ate and it will input your calories and macros.
        </p>

        <input
          type="text"
          className="input-field text-sm"
          placeholder="e.g. scrambled eggs, toast and orange juice"
          value={foodText}
          onChange={e => setFoodText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') analyseFood() }}
        />

        {foodText.trim() && (
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

        {analysing && !foodText.trim() && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-[#a78bfa]">
            <div className="w-4 h-4 border-2 border-[#a78bfa] border-t-transparent rounded-full animate-spin" />
            Reading label...
          </div>
        )}

        {nutritionError && (
          <p className="text-xs text-red-400">{nutritionError}</p>
        )}

        {nutritionResult && (
          <div className="bg-[#1a2820] rounded-xl p-3 space-y-3">
            <p className="text-xs text-gray-400 italic truncate">"{nutritionResult._raw}"</p>

            {/* Portion selector — shown for label scans and always available */}
            <div className="space-y-1.5">
              <p className="text-[10px] text-gray-500">Portion</p>
              <div className="flex gap-1.5">
                {PORTION_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setPortion(opt.value)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: portion === opt.value ? '#7c3aed33' : '#0f1d17',
                      color: portion === opt.value ? '#a78bfa' : '#6b7280',
                      border: portion === opt.value ? '1px solid #7c3aed66' : '1px solid transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Macro preview — adjusted for portion */}
            {(() => {
              const s = nutritionResult._perServing ?? nutritionResult
              const hasAlc = (s.alcohol_units ?? 0) > 0
              const items = [
                { label: 'Cal', value: Math.round((s.calories ?? 0) * portion), unit: '' },
                { label: 'Protein', value: Math.round((s.protein_g ?? 0) * portion * 10) / 10, unit: 'g' },
                { label: 'Fat', value: Math.round((s.fat_g ?? 0) * portion * 10) / 10, unit: 'g' },
                { label: 'Carbs', value: Math.round((s.carbs_g ?? 0) * portion * 10) / 10, unit: 'g' },
                { label: 'Sugar', value: Math.round((s.sugar_g ?? 0) * portion * 10) / 10, unit: 'g' },
                ...(hasAlc ? [{ label: 'Alc', value: Math.round((s.alcohol_units ?? 0) * portion * 100) / 100, unit: 'u' }] : []),
              ]
              return (
                <div className={`grid gap-1 text-center ${hasAlc ? 'grid-cols-6' : 'grid-cols-5'}`}>
                  {items.map(({ label, value, unit }) => (
                    <div key={label} className="bg-[#0f1d17] rounded-lg py-2 px-1">
                      <p className="text-xs font-bold text-gray-100">{value}{unit}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              )
            })()}

            <button
              type="button"
              onClick={applyNutrition}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-green/10 text-brand-green text-sm font-medium hover:bg-brand-green/20 transition-colors"
            >
              Add to today's log
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
