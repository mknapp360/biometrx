import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePreferences, type DateFormat, type UnitSystem } from '../hooks/usePreferences'
import { LogOut, Check } from 'lucide-react'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { prefs, updatePrefs } = usePreferences()

  const [dob, setDob] = useState(prefs.date_of_birth ?? '')
  const [dateFormat, setDateFormat] = useState<DateFormat>(prefs.date_format)
  const [units, setUnits] = useState<UnitSystem>(prefs.units)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setDob(prefs.date_of_birth ?? '')
    setDateFormat(prefs.date_format)
    setUnits(prefs.units)
  }, [prefs])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await updatePrefs({
      date_of_birth: dob || null,
      date_format: dateFormat,
      units,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges =
    dob !== (prefs.date_of_birth ?? '') ||
    dateFormat !== prefs.date_format ||
    units !== prefs.units

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Profile</h1>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1e3029] text-sm font-medium text-gray-300 hover:bg-[#253d34] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>

      {/* Account info */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Account</h2>
        <p className="text-sm text-gray-300">{user?.email}</p>
      </div>

      {/* Date of birth */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Date of Birth</h2>
        <p className="text-xs text-gray-500 mb-2">Used to calculate your BiometRx Age.</p>
        <input
          type="date"
          className="input-field"
          value={dob}
          onChange={e => setDob(e.target.value)}
        />
      </div>

      {/* Date format */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Date Format</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setDateFormat('uk')}
            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              dateFormat === 'uk'
                ? 'bg-brand-green text-white'
                : 'bg-[#1e3029] text-gray-400 hover:bg-[#253d34]'
            }`}
          >
            <span className="block font-semibold">DD/MM/YYYY</span>
            <span className="block text-[11px] mt-0.5 opacity-70">16/06/2026</span>
          </button>
          <button
            onClick={() => setDateFormat('us')}
            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              dateFormat === 'us'
                ? 'bg-brand-green text-white'
                : 'bg-[#1e3029] text-gray-400 hover:bg-[#253d34]'
            }`}
          >
            <span className="block font-semibold">MM/DD/YYYY</span>
            <span className="block text-[11px] mt-0.5 opacity-70">06/16/2026</span>
          </button>
        </div>
      </div>

      {/* Units */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Measurements</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setUnits('metric')}
            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              units === 'metric'
                ? 'bg-brand-green text-white'
                : 'bg-[#1e3029] text-gray-400 hover:bg-[#253d34]'
            }`}
          >
            <span className="block font-semibold">Metric</span>
            <span className="block text-[11px] mt-0.5 opacity-70">kg · cm</span>
          </button>
          <button
            onClick={() => setUnits('imperial')}
            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
              units === 'imperial'
                ? 'bg-brand-green text-white'
                : 'bg-[#1e3029] text-gray-400 hover:bg-[#253d34]'
            }`}
          >
            <span className="block font-semibold">Imperial</span>
            <span className="block text-[11px] mt-0.5 opacity-70">lbs · ft/in</span>
          </button>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        className={`btn-primary w-full flex items-center justify-center gap-2 ${
          saved ? '!bg-brand-green-dark' : ''
        }`}
      >
        {saved ? (
          <>
            <Check className="w-5 h-5" />
            Saved
          </>
        ) : saving ? (
          'Saving...'
        ) : (
          'Save Preferences'
        )}
      </button>
    </div>
  )
}
