import { useState } from 'react'
import { format } from 'date-fns'

export interface BloodPanelFormData {
  test_date: string
  hba1c: number | null
  glucose: number | null
  total_cholesterol: number | null
  hdl: number | null
  ldl: number | null
  triglycerides: number | null
  alt: number | null
  ast: number | null
  creatinine: number | null
  egfr: number | null
  crp: number | null
  testosterone: number | null
  shbg: number | null
  estradiol: number | null
  notes: string | null
}

interface BloodPanelFormProps {
  onSubmit: (data: BloodPanelFormData) => Promise<{ error: unknown }>
  initialValues?: Partial<BloodPanelFormData>
  submitLabel?: string
}

function Field({ label, unit, value, onChange, step = '0.01' }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; step?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1">
        {label} <span className="text-gray-600">{unit}</span>
      </label>
      <input
        type="number"
        step={step}
        className="input-field text-sm"
        placeholder="—"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

export default function BloodPanelForm({ onSubmit, initialValues, submitLabel = 'Save Panel' }: BloodPanelFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [testDate, setTestDate] = useState(initialValues?.test_date ?? format(new Date(), 'yyyy-MM-dd'))
  const [hba1c, setHba1c] = useState(initialValues?.hba1c?.toString() ?? '')
  const [glucose, setGlucose] = useState(initialValues?.glucose?.toString() ?? '')
  const [totalChol, setTotalChol] = useState(initialValues?.total_cholesterol?.toString() ?? '')
  const [hdl, setHdl] = useState(initialValues?.hdl?.toString() ?? '')
  const [ldl, setLdl] = useState(initialValues?.ldl?.toString() ?? '')
  const [triglycerides, setTriglycerides] = useState(initialValues?.triglycerides?.toString() ?? '')
  const [alt, setAlt] = useState(initialValues?.alt?.toString() ?? '')
  const [ast, setAst] = useState(initialValues?.ast?.toString() ?? '')
  const [creatinine, setCreatinine] = useState(initialValues?.creatinine?.toString() ?? '')
  const [egfr, setEgfr] = useState(initialValues?.egfr?.toString() ?? '')
  const [crp, setCrp] = useState(initialValues?.crp?.toString() ?? '')
  const [testosterone, setTestosterone] = useState(initialValues?.testosterone?.toString() ?? '')
  const [shbg, setShbg] = useState(initialValues?.shbg?.toString() ?? '')
  const [estradiol, setEstradiol] = useState(initialValues?.estradiol?.toString() ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  const toNum = (v: string) => v ? parseFloat(v) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!testDate) {
      setError('Test date is required.')
      return
    }

    setSaving(true)
    const data: BloodPanelFormData = {
      test_date: testDate,
      hba1c: toNum(hba1c),
      glucose: toNum(glucose),
      total_cholesterol: toNum(totalChol),
      hdl: toNum(hdl),
      ldl: toNum(ldl),
      triglycerides: toNum(triglycerides),
      alt: toNum(alt),
      ast: toNum(ast),
      creatinine: toNum(creatinine),
      egfr: toNum(egfr),
      crp: toNum(crp),
      testosterone: toNum(testosterone),
      shbg: toNum(shbg),
      estradiol: toNum(estradiol),
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Test Date</label>
        <input
          type="date"
          className="input-field"
          value={testDate}
          onChange={e => setTestDate(e.target.value)}
          required
        />
      </div>

      {/* Metabolic */}
      <div>
        <h3 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-2">Metabolic Health</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="HbA1c" unit="mmol/mol" value={hba1c} onChange={setHba1c} />
          <Field label="Glucose" unit="mmol/L" value={glucose} onChange={setGlucose} />
        </div>
      </div>

      {/* Lipids */}
      <div>
        <h3 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-2">Lipids</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Total Cholesterol" unit="mmol/L" value={totalChol} onChange={setTotalChol} />
          <Field label="HDL" unit="mmol/L" value={hdl} onChange={setHdl} />
          <Field label="LDL" unit="mmol/L" value={ldl} onChange={setLdl} />
          <Field label="Triglycerides" unit="mmol/L" value={triglycerides} onChange={setTriglycerides} />
        </div>
      </div>

      {/* Liver */}
      <div>
        <h3 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-2">Liver</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ALT" unit="U/L" value={alt} onChange={setAlt} />
          <Field label="AST" unit="U/L" value={ast} onChange={setAst} />
        </div>
      </div>

      {/* Kidney */}
      <div>
        <h3 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-2">Kidney</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Creatinine" unit="µmol/L" value={creatinine} onChange={setCreatinine} />
          <Field label="eGFR" unit="mL/min" value={egfr} onChange={setEgfr} />
        </div>
      </div>

      {/* Inflammation */}
      <div>
        <h3 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-2">Inflammation</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CRP" unit="mg/L" value={crp} onChange={setCrp} />
        </div>
      </div>

      {/* Hormones */}
      <div>
        <h3 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-2">Hormones</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Testosterone" unit="nmol/L" value={testosterone} onChange={setTestosterone} />
          <Field label="SHBG" unit="nmol/L" value={shbg} onChange={setShbg} />
          <Field label="Estradiol" unit="pmol/L" value={estradiol} onChange={setEstradiol} />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">Notes</label>
        <textarea
          className="input-field resize-none text-sm"
          rows={3}
          placeholder="Lab name, fasting status, anything notable..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      <button type="submit" disabled={saving} className="btn-primary w-full">
        {saving ? 'Saving...' : submitLabel}
      </button>
    </form>
  )
}
