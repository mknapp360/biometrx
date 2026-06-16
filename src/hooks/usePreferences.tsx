import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

export type DateFormat = 'uk' | 'us'
export type UnitSystem = 'metric' | 'imperial'

export interface UserPreferences {
  date_of_birth: string | null    // ISO date string YYYY-MM-DD
  date_format: DateFormat
  units: UnitSystem
}

const defaultPrefs: UserPreferences = {
  date_of_birth: null,
  date_format: 'uk',
  units: 'metric',
}

interface PreferencesContextType {
  prefs: UserPreferences
  loading: boolean
  updatePrefs: (updates: Partial<UserPreferences>) => Promise<void>
  formatDate: (date: Date | string) => string
  formatWeight: (kg: number | null) => string
  formatHeight: (cm: number | null) => string
  weightUnit: string
  heightUnit: string
  toKg: (value: number) => number
  fromKg: (kg: number) => number
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<UserPreferences>(defaultPrefs)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setPrefs(defaultPrefs)
      setLoading(false)
      return
    }
    const meta = user.user_metadata ?? {}
    setPrefs({
      date_of_birth: meta.date_of_birth ?? null,
      date_format: meta.date_format ?? 'uk',
      units: meta.units ?? 'metric',
    })
    setLoading(false)
  }, [user])

  const updatePrefs = useCallback(async (updates: Partial<UserPreferences>) => {
    const merged = { ...prefs, ...updates }
    setPrefs(merged)
    await supabase.auth.updateUser({
      data: {
        date_of_birth: merged.date_of_birth,
        date_format: merged.date_format,
        units: merged.units,
      },
    })
  }, [prefs])

  const formatDate = useCallback((date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    const day = d.getDate().toString().padStart(2, '0')
    const month = (d.getMonth() + 1).toString().padStart(2, '0')
    const year = d.getFullYear()
    return prefs.date_format === 'uk'
      ? `${day}/${month}/${year}`
      : `${month}/${day}/${year}`
  }, [prefs.date_format])

  const fromKg = useCallback((kg: number): number => {
    return prefs.units === 'imperial' ? Math.round(kg * 2.20462 * 10) / 10 : kg
  }, [prefs.units])

  const toKg = useCallback((value: number): number => {
    return prefs.units === 'imperial' ? Math.round((value / 2.20462) * 100) / 100 : value
  }, [prefs.units])

  const formatWeight = useCallback((kg: number | null): string => {
    if (kg === null) return '—'
    if (prefs.units === 'imperial') {
      return `${(Number(kg) * 2.20462).toFixed(1)}`
    }
    return `${Number(kg).toFixed(1)}`
  }, [prefs.units])

  const formatHeight = useCallback((cm: number | null): string => {
    if (cm === null) return '—'
    if (prefs.units === 'imperial') {
      const totalInches = Number(cm) / 2.54
      const feet = Math.floor(totalInches / 12)
      const inches = Math.round(totalInches % 12)
      return `${feet}'${inches}"`
    }
    return `${Number(cm).toFixed(0)}`
  }, [prefs.units])

  const weightUnit = prefs.units === 'imperial' ? 'lbs' : 'kg'
  const heightUnit = prefs.units === 'imperial' ? 'ft/in' : 'cm'

  return (
    <PreferencesContext.Provider value={{
      prefs, loading, updatePrefs,
      formatDate, formatWeight, formatHeight,
      weightUnit, heightUnit, toKg, fromKg,
    }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (!context) throw new Error('usePreferences must be used within PreferencesProvider')
  return context
}
