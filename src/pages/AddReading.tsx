import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReadingForm, { type ReadingFormData } from '../components/ReadingForm'
import BloodPanelForm, { type BloodPanelFormData } from '../components/BloodPanelForm'
import { useReadings } from '../hooks/useReadings'
import { useBloodPanels } from '../hooks/useBloodPanels'
import { CheckCircle, TestTubes, X } from 'lucide-react'

export default function AddReading() {
  const { addReading } = useReadings()
  const { addPanel } = useBloodPanels()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const [showPanelModal, setShowPanelModal] = useState(false)
  const [panelSaved, setPanelSaved] = useState(false)

  const handleSubmit = async (data: ReadingFormData) => {
    const result = await addReading(data)
    if (!result.error) {
      setSaved(true)
      setTimeout(() => navigate('/dashboard'), 1200)
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

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <CheckCircle className="w-12 h-12 text-brand-green" />
        <p className="text-lg font-semibold">Reading saved</p>
        <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Add Reading</h1>
      <ReadingForm
        onSubmit={handleSubmit}
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
              Blood pressure, weight, sleep, medication, and blood tests each tell part of the story. BiometRx combines them to help you understand what is driving your health improvements and where to focus next.
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
