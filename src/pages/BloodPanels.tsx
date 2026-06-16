import { useState } from 'react'
import { format } from 'date-fns'
import { useBloodPanels } from '../hooks/useBloodPanels'
import BloodPanelForm, { type BloodPanelFormData } from '../components/BloodPanelForm'
import type { BloodPanel } from '../types'
import { Plus, X, Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react'

function PanelValue({ label, value, unit, warn }: { label: string; value: number | null; unit: string; warn?: boolean }) {
  if (value == null) return null
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-[#1e3029] last:border-0">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${warn ? 'text-warning' : 'text-gray-200'}`}>
        {Number(value).toFixed(2)} <span className="text-[10px] font-normal text-gray-500">{unit}</span>
      </span>
    </div>
  )
}

function PanelCard({ panel, onEdit, onDelete }: {
  panel: BloodPanel
  onEdit: () => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Delete this blood panel?')) return
    setDeleting(true)
    await onDelete()
    setDeleting(false)
  }

  const hasMetabolic = panel.hba1c != null || panel.glucose != null
  const hasLipids = panel.total_cholesterol != null || panel.hdl != null || panel.ldl != null || panel.triglycerides != null
  const hasLiver = panel.alt != null || panel.ast != null
  const hasKidney = panel.creatinine != null || panel.egfr != null
  const hasInflammation = panel.crp != null
  const hasHormones = panel.testosterone != null || panel.shbg != null || panel.estradiol != null

  // Quick summary values
  const summaryItems: string[] = []
  if (panel.hba1c != null) summaryItems.push(`HbA1c ${Number(panel.hba1c).toFixed(1)}`)
  if (panel.total_cholesterol != null) summaryItems.push(`Chol ${Number(panel.total_cholesterol).toFixed(1)}`)
  if (panel.crp != null) summaryItems.push(`CRP ${Number(panel.crp).toFixed(1)}`)
  if (panel.egfr != null) summaryItems.push(`eGFR ${Number(panel.egfr).toFixed(0)}`)

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <p className="text-xs text-gray-500 mb-1">
            {format(new Date(panel.test_date + 'T00:00:00'), 'EEE dd MMM yyyy')}
          </p>
          <p className="text-xs text-gray-400">
            {summaryItems.join('  ·  ') || 'No values recorded'}
          </p>
        </button>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029]">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button onClick={onEdit} className="p-2 rounded-lg text-gray-500 hover:text-brand-green hover:bg-[#1e3029]">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={handleDelete} disabled={deleting} className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {hasMetabolic && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Metabolic</h4>
              <PanelValue label="HbA1c" value={panel.hba1c} unit="mmol/mol" warn={panel.hba1c != null && Number(panel.hba1c) >= 48} />
              <PanelValue label="Glucose" value={panel.glucose} unit="mmol/L" warn={panel.glucose != null && Number(panel.glucose) > 6.0} />
            </div>
          )}
          {hasLipids && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Lipids</h4>
              <PanelValue label="Total Cholesterol" value={panel.total_cholesterol} unit="mmol/L" warn={panel.total_cholesterol != null && Number(panel.total_cholesterol) > 5.0} />
              <PanelValue label="HDL" value={panel.hdl} unit="mmol/L" />
              <PanelValue label="LDL" value={panel.ldl} unit="mmol/L" warn={panel.ldl != null && Number(panel.ldl) > 3.0} />
              <PanelValue label="Triglycerides" value={panel.triglycerides} unit="mmol/L" warn={panel.triglycerides != null && Number(panel.triglycerides) > 1.7} />
            </div>
          )}
          {hasLiver && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Liver</h4>
              <PanelValue label="ALT" value={panel.alt} unit="U/L" warn={panel.alt != null && Number(panel.alt) > 40} />
              <PanelValue label="AST" value={panel.ast} unit="U/L" warn={panel.ast != null && Number(panel.ast) > 40} />
            </div>
          )}
          {hasKidney && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Kidney</h4>
              <PanelValue label="Creatinine" value={panel.creatinine} unit="µmol/L" />
              <PanelValue label="eGFR" value={panel.egfr} unit="mL/min" warn={panel.egfr != null && Number(panel.egfr) < 60} />
            </div>
          )}
          {hasInflammation && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Inflammation</h4>
              <PanelValue label="CRP" value={panel.crp} unit="mg/L" warn={panel.crp != null && Number(panel.crp) > 3.0} />
            </div>
          )}
          {hasHormones && (
            <div>
              <h4 className="text-[10px] font-bold text-brand-green uppercase tracking-wider mb-1">Hormones</h4>
              <PanelValue label="Testosterone" value={panel.testosterone} unit="nmol/L" />
              <PanelValue label="SHBG" value={panel.shbg} unit="nmol/L" />
              <PanelValue label="Estradiol" value={panel.estradiol} unit="pmol/L" />
            </div>
          )}
          {panel.notes && (
            <p className="text-xs text-gray-500 italic pt-1">{panel.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function BloodPanels() {
  const { panels, loading, addPanel, updatePanel, deletePanel } = useBloodPanels()
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<BloodPanel | null>(null)

  const handleAdd = async (data: BloodPanelFormData) => {
    const result = await addPanel(data)
    if (!result.error) setShowAdd(false)
    return result
  }

  const handleUpdate = async (data: BloodPanelFormData) => {
    if (!editing) return { error: new Error('No panel selected') }
    const result = await updatePanel(editing.id, data)
    if (!result.error) setEditing(null)
    return result
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Blood Panels</h1>
        <button
          onClick={() => { setShowAdd(true); setEditing(null) }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand-green text-sm font-medium text-white hover:bg-brand-green-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Panel
        </button>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-[#131f1b] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-100">New Blood Panel</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <BloodPanelForm onSubmit={handleAdd} />
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[#131f1b] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-100">Edit Blood Panel</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-[#1e3029]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <BloodPanelForm
              onSubmit={handleUpdate}
              submitLabel="Update Panel"
              initialValues={{
                test_date: editing.test_date,
                hba1c: editing.hba1c != null ? Number(editing.hba1c) : null,
                glucose: editing.glucose != null ? Number(editing.glucose) : null,
                total_cholesterol: editing.total_cholesterol != null ? Number(editing.total_cholesterol) : null,
                hdl: editing.hdl != null ? Number(editing.hdl) : null,
                ldl: editing.ldl != null ? Number(editing.ldl) : null,
                triglycerides: editing.triglycerides != null ? Number(editing.triglycerides) : null,
                alt: editing.alt != null ? Number(editing.alt) : null,
                ast: editing.ast != null ? Number(editing.ast) : null,
                creatinine: editing.creatinine != null ? Number(editing.creatinine) : null,
                egfr: editing.egfr != null ? Number(editing.egfr) : null,
                crp: editing.crp != null ? Number(editing.crp) : null,
                testosterone: editing.testosterone != null ? Number(editing.testosterone) : null,
                shbg: editing.shbg != null ? Number(editing.shbg) : null,
                estradiol: editing.estradiol != null ? Number(editing.estradiol) : null,
                notes: editing.notes,
              }}
            />
          </div>
        </div>
      )}

      {/* Panel list */}
      {panels.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 mb-2">No blood panels yet</p>
          <p className="text-sm text-gray-500">Tap <strong className="text-brand-green">Add Panel</strong> to log your first results.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {panels.map(p => (
            <PanelCard
              key={p.id}
              panel={p}
              onEdit={() => { setEditing(p); setShowAdd(false) }}
              onDelete={() => deletePanel(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
