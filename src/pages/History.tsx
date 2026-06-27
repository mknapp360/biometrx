import { useState, useMemo } from 'react'
import { useReadings } from '../hooks/useReadings'
import ReadingsTable from '../components/ReadingsTable'
import ReadingForm, { type ReadingFormData } from '../components/ReadingForm'
import type { HealthReading } from '../types'
import { X, History as HistoryIcon } from 'lucide-react'

export default function History() {
  const { readings, loading, deleteReading, updateReading, addReading } = useReadings()
  const [editing, setEditing] = useState<HealthReading | null>(null)
  const [showAddPrevious, setShowAddPrevious] = useState(false)

  const handleUpdate = async (data: ReadingFormData) => {
    if (!editing) return { error: new Error('No reading selected') }
    const result = await updateReading(editing.id, data)
    if (!result.error) setEditing(null)
    return result
  }

  const handleAddPrevious = async (data: ReadingFormData) => {
    const result = await addReading(data)
    if (!result.error) setShowAddPrevious(false)
    return result
  }

  const historyReadings = useMemo(() => {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    return readings.filter(r => new Date(r.recorded_at) < startOfToday)
  }, [readings])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Readings History</h1>
        {!editing && (
          <button
            onClick={() => setShowAddPrevious(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e3029] text-sm font-medium text-gray-300 hover:bg-[#253d34] transition-colors"
          >
            <HistoryIcon className="w-4 h-4" />
            Add previous data
          </button>
        )}
      </div>

      {/* Add previous data modal */}
      {showAddPrevious && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAddPrevious(false)}>
          <div className="bg-[#131f1b] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-100">Add Previous Reading</h3>
              <button
                onClick={() => setShowAddPrevious(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ReadingForm
              onSubmit={handleAddPrevious}
              submitLabel="Save Previous Reading"
              bpOptional
            />
          </div>
        </div>
      )}

      {editing ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Edit Reading</h2>
            <button
              onClick={() => setEditing(null)}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <ReadingForm
            onSubmit={handleUpdate}
            bpOptional
            initialValues={{
              recorded_at: editing.recorded_at,
              systolic: editing.systolic,
              diastolic: editing.diastolic,
              pulse: editing.pulse,
              weight_kg: editing.weight_kg ? Number(editing.weight_kg) : null,
              mounjaro_dose_mg: editing.mounjaro_dose_mg ? Number(editing.mounjaro_dose_mg) : null,
              glucose_mmol: editing.glucose_mmol ? Number(editing.glucose_mmol) : null,
              sleep_hours: editing.sleep_hours ? Number(editing.sleep_hours) : null,
              steps: editing.steps,
              calories: editing.calories,
              protein_g: editing.protein_g ? Number(editing.protein_g) : null,
              fat_g: editing.fat_g ? Number(editing.fat_g) : null,
              carbs_g: editing.carbs_g ? Number(editing.carbs_g) : null,
              sugar_g: editing.sugar_g ? Number(editing.sugar_g) : null,
              notes: editing.notes,
            }}
            submitLabel="Update Reading"
          />
        </div>
      ) : (
        <ReadingsTable
          readings={historyReadings}
          onDelete={deleteReading}
          onEdit={setEditing}
        />
      )}
    </div>
  )
}
