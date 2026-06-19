import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePreferences, type DateFormat, type UnitSystem } from '../hooks/usePreferences'
import { LogOut, Check, Download, Share } from 'lucide-react'

// Capture the beforeinstallprompt event globally
let deferredPrompt: BeforeInstallPromptEvent | null = null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
  })
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone === true)
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { prefs, updatePrefs } = usePreferences()

  const [name, setName] = useState(prefs.name ?? '')
  const [dob, setDob] = useState(prefs.date_of_birth ?? '')
  const [dateFormat, setDateFormat] = useState<DateFormat>(prefs.date_format)
  const [units, setUnits] = useState<UnitSystem>(prefs.units)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    setInstalled(isStandalone())
  }, [])

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

      {/* Install app */}
      {!installed && (
        <div className="card">
          <h2 className="text-xs font-bold text-brand-green uppercase tracking-wider mb-3">Install App</h2>
          {showIOSGuide ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 leading-relaxed">
                To install BioMetRx on your iPhone or iPad:
              </p>
              <ol className="text-xs text-gray-400 leading-relaxed space-y-2 list-decimal list-inside">
                <li>Tap the <Share className="w-4 h-4 inline text-blue-400 -mt-0.5" /> <strong className="text-gray-300">Share</strong> button in Safari's toolbar</li>
                <li>Scroll down and tap <strong className="text-gray-300">"Add to Home Screen"</strong></li>
                <li>Tap <strong className="text-gray-300">"Add"</strong> in the top right</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Dismiss
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-3">
                Install BioMetRx to your home screen for a full-screen app experience.
              </p>
              <button
                onClick={async () => {
                  if (deferredPrompt) {
                    await deferredPrompt.prompt()
                    const { outcome } = await deferredPrompt.userChoice
                    if (outcome === 'accepted') setInstalled(true)
                    deferredPrompt = null
                  } else if (isIOS()) {
                    setShowIOSGuide(true)
                  } else {
                    // Fallback: show generic instructions
                    setShowIOSGuide(true)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1e3029] text-sm font-medium text-gray-300 hover:bg-[#253d34] transition-colors"
              >
                <Download className="w-5 h-5" />
                Add to Home Screen
              </button>
            </>
          )}
        </div>
      )}

      {installed && (
        <div className="card">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-brand-green" />
            <p className="text-xs text-gray-400">BioMetRx is installed on your device.</p>
          </div>
        </div>
      )}

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
