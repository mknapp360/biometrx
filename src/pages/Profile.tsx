import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePreferences, type DateFormat, type UnitSystem } from '../hooks/usePreferences'
import { useHealthConnect } from '../hooks/useHealthConnect'
import { LogOut, Check, Heart, Unlink, Settings } from 'lucide-react'

export default function Profile() {
  const { user, signOut } = useAuth()
  const { prefs, updatePrefs } = usePreferences()
  const { enabled: hcEnabled, loading: hcLoading, enableHealthConnect, disableHealthConnect, openSettings: openHCSettings } = useHealthConnect()

  const [name, setName] = useState(prefs.name ?? '')
  const [dob, setDob] = useState(prefs.date_of_birth ?? '')
  const [dateFormat, setDateFormat] = useState<DateFormat>(prefs.date_format)
  const [units, setUnits] = useState<UnitSystem>(prefs.units)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(prefs.name ?? '')
    setDob(prefs.date_of_birth ?? '')
    setDateFormat(prefs.date_format)
    setUnits(prefs.units)
  }, [prefs])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    await updatePrefs({
      name: name.trim() || null,
      date_of_birth: dob || null,
      date_format: dateFormat,
      units,
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasChanges =
    name !== (prefs.name ?? '') ||
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

      {/* Name */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Name</h2>
        <input
          type="text"
          className="input-field"
          placeholder="Your first name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* Date of birth */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Date of Birth</h2>
        <p className="text-xs text-gray-500 mb-2">Used to calculate your BioMetRx Age.</p>
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

      {/* Health Connect */}
      <div className="card">
        <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Health Connect</h2>
        {hcEnabled ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-brand-green" />
              <p className="text-sm text-gray-300">Linked — syncing steps and heart rate</p>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              BioMetRx reads from Health Connect automatically. If your wearable data isn't showing up, open your wearable's companion app (Samsung Health, Fitbit, Garmin Connect, etc.) and make sure Health Connect sync is turned on in its settings.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={openHCSettings}
                className="flex items-center gap-1.5 text-xs text-brand-green hover:text-brand-green-light transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Open Health Connect
              </button>
              <button
                onClick={disableHealthConnect}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Unlink className="w-3.5 h-3.5" />
                Unlink
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500 leading-relaxed mb-2">
              Health Connect is Android's universal health hub. Linking it lets BioMetRx automatically pull your daily steps and heart rate — whether from your phone or a wearable.
            </p>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Works with any wearable that syncs to Android — Samsung Galaxy Watch, Fitbit, Garmin, Wear OS, and more. Just make sure Health Connect sync is enabled in your wearable's companion app.
            </p>
            <button
              onClick={enableHealthConnect}
              disabled={hcLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand-green text-sm font-medium text-white hover:bg-brand-green-dark transition-colors disabled:opacity-50"
            >
              <Heart className="w-5 h-5" />
              {hcLoading ? 'Connecting...' : 'Link to Health Connect'}
            </button>
          </>
        )}
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
