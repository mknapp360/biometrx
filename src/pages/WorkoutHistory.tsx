import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, Dumbbell, Plus } from 'lucide-react'
import { useWorkouts } from '../hooks/useWorkouts'
import { useWorkoutSync } from '../hooks/useWorkoutSync'
import { CATEGORY_LABELS, CATEGORY_COLORS, fmtDuration, fmtDistance, type BioMetRxCategory } from '../utils/workoutClassification'
import type { WorkoutSession } from '../types'

const CATEGORIES: BioMetRxCategory[] = ['strength', 'cardio', 'running', 'walking', 'cycling', 'mixed', 'mobility']

function WorkoutDetailModal({ workout, onClose }: { workout: WorkoutSession; onClose: () => void }) {
  const cat = workout.biometrx_category as BioMetRxCategory
  const color = CATEGORY_COLORS[cat] ?? '#6b7280'
  const startDate = new Date(workout.start_time)
  const dateStr = startDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-[#131f1b] rounded-t-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mb-2" style={{ backgroundColor: color + '33', color }}>
              {CATEGORY_LABELS[cat] ?? workout.workout_type}
            </span>
            <p className="text-base font-bold text-gray-100">{dateStr}</p>
            <p className="text-xs text-gray-500">{timeStr}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#1a2820] rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-gray-100">{fmtDuration(workout.duration_min)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Duration</p>
          </div>
          {workout.distance_m !== null && workout.distance_m > 0 ? (
            <div className="bg-[#1a2820] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-100">{fmtDistance(workout.distance_m)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Distance</p>
            </div>
          ) : (
            <div className="bg-[#1a2820] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-100">{workout.calories_burned !== null ? `${workout.calories_burned}` : '—'}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Calories</p>
            </div>
          )}
          {workout.avg_heart_rate !== null && (
            <div className="bg-[#1a2820] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-100">{workout.avg_heart_rate} bpm</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Avg HR</p>
            </div>
          )}
          {workout.max_heart_rate !== null && (
            <div className="bg-[#1a2820] rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-100">{workout.max_heart_rate} bpm</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Max HR</p>
            </div>
          )}
        </div>
        {workout.source_app && (
          <p className="text-xs text-gray-600 text-center">Recorded by {workout.source_app}</p>
        )}
      </div>
    </div>
  )
}

interface LogFormState {
  category: BioMetRxCategory
  date: string
  hours: string
  minutes: string
  distance_km: string
  notes: string
}

function LogWorkoutModal({ onClose, onSave }: { onClose: () => void; onSave: (form: LogFormState) => Promise<void> }) {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)

  const [form, setForm] = useState<LogFormState>({
    category: 'strength',
    date: localDate,
    hours: '1',
    minutes: '0',
    distance_km: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof LogFormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  const showDistance = ['running', 'walking', 'cycling'].includes(form.category)

  const handleSave = async () => {
    const h = parseInt(form.hours) || 0
    const m = parseInt(form.minutes) || 0
    if (h === 0 && m === 0) { setError('Enter a duration'); return }
    setSaving(true)
    setError(null)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={onClose}>
      <div className="bg-[#131f1b] rounded-t-2xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-100">Log Workout</h3>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category picker */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Type</p>
          <div className="grid grid-cols-4 gap-1.5">
            {CATEGORIES.map(cat => {
              const color = CATEGORY_COLORS[cat]
              const active = form.category === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => set('category', cat)}
                  className="py-2 px-1 rounded-xl text-[11px] font-medium transition-all"
                  style={{
                    backgroundColor: active ? color + '33' : '#1a2820',
                    color: active ? color : '#9ca3af',
                    border: active ? `1px solid ${color}66` : '1px solid transparent',
                  }}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Date</p>
          <input
            type="date"
            className="input-field text-sm w-full"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>

        {/* Duration */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Duration</p>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              min="0"
              max="12"
              className="input-field text-sm w-20 text-center"
              value={form.hours}
              onChange={e => set('hours', e.target.value)}
            />
            <span className="text-sm text-gray-500">hr</span>
            <input
              type="number"
              min="0"
              max="59"
              className="input-field text-sm w-20 text-center"
              value={form.minutes}
              onChange={e => set('minutes', e.target.value)}
            />
            <span className="text-sm text-gray-500">min</span>
          </div>
        </div>

        {/* Distance — only for relevant categories */}
        {showDistance && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-400">Distance (km) <span className="text-gray-600">optional</span></p>
            <input
              type="number"
              min="0"
              step="0.1"
              className="input-field text-sm w-32"
              placeholder="e.g. 5.0"
              value={form.distance_km}
              onChange={e => set('distance_km', e.target.value)}
            />
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-gray-400">Notes <span className="text-gray-600">optional</span></p>
          <input
            type="text"
            className="input-field text-sm w-full"
            placeholder="e.g. Bannatyne weights session"
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}

// Group workouts by calendar week
function groupByWeek(workouts: WorkoutSession[]): { weekLabel: string; sessions: WorkoutSession[] }[] {
  const groups: Map<string, WorkoutSession[]> = new Map()
  for (const w of workouts) {
    const d = new Date(w.workout_date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d.setDate(diff))
    const key = monday.toISOString().slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(w)
  }
  return Array.from(groups.entries()).map(([key, sessions]) => {
    const d = new Date(key)
    const weekLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return { weekLabel: `w/c ${weekLabel}`, sessions }
  })
}

export default function WorkoutHistory() {
  const navigate = useNavigate()
  const { workouts, loading, refresh, addWorkout } = useWorkouts()
  const { sync, resetSyncTimestamp } = useWorkoutSync()
  const [selected, setSelected] = useState<WorkoutSession | null>(null)
  const [showLog, setShowLog] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    setSyncMsg(null)
    resetSyncTimestamp()
    const { synced, error } = await sync()
    if (error) {
      setSyncMsg(`Sync failed: ${error}`)
    } else if (synced === 0) {
      setSyncMsg('Up to date')
    } else {
      setSyncMsg(`Synced ${synced} workout${synced === 1 ? '' : 's'}`)
      await refresh()
    }
    setSyncing(false)
    setTimeout(() => setSyncMsg(null), 3000)
  }

  const handleSave = async (form: LogFormState) => {
    const h = parseInt(form.hours) || 0
    const m = parseInt(form.minutes) || 0
    const durationMin = h * 60 + m
    const distanceM = form.distance_km ? parseFloat(form.distance_km) * 1000 : null

    // Build start/end times: start = date at 09:00, end = start + duration
    const start = new Date(`${form.date}T09:00:00`)
    const end = new Date(start.getTime() + durationMin * 60000)

    await addWorkout({
      source_id: null,
      workout_date: form.date,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_min: durationMin,
      workout_type: form.category,
      biometrx_category: form.category,
      distance_m: distanceM,
      calories_burned: null,
      avg_heart_rate: null,
      max_heart_rate: null,
      source_app: 'manual',
      notes: form.notes || null,
    })
    setShowLog(false)
  }

  const groups = groupByWeek(workouts)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-[#1e3029]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Workout History</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1e3029] text-[#8b5cf6] hover:bg-[#2a3f35] disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync HC'}
          </button>
          <button
            onClick={() => setShowLog(true)}
            className="p-2 rounded-xl bg-[#1e3029] text-brand-green hover:bg-[#2a3f35] transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="text-xs text-gray-400 text-center py-1">{syncMsg}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[#8b5cf6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : workouts.length === 0 ? (
        <div className="card text-center py-10 space-y-3">
          <Dumbbell className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-sm text-gray-400">No workouts yet</p>
          <p className="text-xs text-gray-600">Tap + to log one, or Sync HC to import from Health Connect</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ weekLabel, sessions }) => (
            <div key={weekLabel} className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{weekLabel}</p>
              <div className="space-y-2">
                {sessions.map(w => {
                  const cat = w.biometrx_category as BioMetRxCategory
                  const color = CATEGORY_COLORS[cat] ?? '#6b7280'
                  const startDate = new Date(w.start_time)
                  const dayStr = startDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                  const timeStr = w.source_app === 'manual'
                    ? 'Manual entry'
                    : startDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div
                      key={w.id}
                      className="card flex items-center gap-3 cursor-pointer hover:bg-[#1a2820] transition-colors"
                      onClick={() => setSelected(w)}
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: color + '22' }}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {CATEGORY_LABELS[cat] ?? w.workout_type}
                        </p>
                        <p className="text-xs text-gray-500">{dayStr} · {timeStr}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-medium text-gray-300">{fmtDuration(w.duration_min)}</p>
                        {w.distance_m !== null && w.distance_m > 0 && (
                          <p className="text-xs text-gray-500">{fmtDistance(w.distance_m)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <WorkoutDetailModal workout={selected} onClose={() => setSelected(null)} />
      )}

      {showLog && (
        <LogWorkoutModal onClose={() => setShowLog(false)} onSave={handleSave} />
      )}
    </div>
  )
}
