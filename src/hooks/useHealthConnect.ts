import { useState, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'

const HC_ENABLED_KEY = 'biometrx_health_connect_enabled'

// Dynamic import to avoid issues on web
let HealthPlugin: any = null

async function getHealthPlugin() {
  if (!HealthPlugin) {
    const mod = await import('@capgo/capacitor-health')
    HealthPlugin = mod.Health
  }
  return HealthPlugin
}

export interface StepsData {
  date: string
  steps: number
}

function isEnabled(): boolean {
  return localStorage.getItem(HC_ENABLED_KEY) === 'true'
}

function setEnabled(val: boolean) {
  localStorage.setItem(HC_ENABLED_KEY, val ? 'true' : 'false')
}

export function useHealthConnect() {
  const [enabled, setEnabledState] = useState(isEnabled)
  const [loading, setLoading] = useState(false)
  const [todaySteps, setTodaySteps] = useState<number | null>(null)

  const ensureAuthorized = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const Health = await getHealthPlugin()
      const avail = await Health.isAvailable()
      if (!avail.available) return false

      const result = await Health.requestAuthorization({
        read: ['steps'],
        write: [],
      })
      return result.readAuthorized?.includes('steps') ?? false
    } catch {
      return false
    }
  }, [])

  const fetchTodaySteps = useCallback(async (): Promise<number | null> => {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const Health = await getHealthPlugin()
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const result = await Health.queryAggregated({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        dataType: 'steps',
        bucket: 'day',
        aggregation: 'sum',
      })
      const samples = result.samples ?? []
      if (samples.length === 0) return null
      return Math.round(samples[0].value)
    } catch {
      return null
    }
  }, [])

  // Enable Health Connect (first-time opt-in)
  const enableHealthConnect = useCallback(async (): Promise<number | null> => {
    setLoading(true)
    try {
      const authorized = await ensureAuthorized()
      if (!authorized) return null

      setEnabled(true)
      setEnabledState(true)

      const steps = await fetchTodaySteps()
      setTodaySteps(steps)
      return steps
    } finally {
      setLoading(false)
    }
  }, [ensureAuthorized, fetchTodaySteps])

  // Manual refresh
  const refreshSteps = useCallback(async (): Promise<number | null> => {
    setLoading(true)
    try {
      const steps = await fetchTodaySteps()
      setTodaySteps(steps)
      return steps
    } finally {
      setLoading(false)
    }
  }, [fetchTodaySteps])

  // Auto-fetch on mount if previously enabled
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return
    let cancelled = false

    const autoSync = async () => {
      setLoading(true)
      try {
        const authorized = await ensureAuthorized()
        if (!authorized || cancelled) return

        const steps = await fetchTodaySteps()
        if (!cancelled) setTodaySteps(steps)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    autoSync()
    return () => { cancelled = true }
  }, [enabled, ensureAuthorized, fetchTodaySteps])

  const getStepsForDateRange = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<StepsData[]> => {
    if (!Capacitor.isNativePlatform()) return []
    try {
      const Health = await getHealthPlugin()
      const result = await Health.readSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataType: 'steps',
      })
      const byDay = new Map<string, number>()
      for (const sample of result.samples ?? []) {
        const day = sample.startDate.split('T')[0]
        byDay.set(day, (byDay.get(day) ?? 0) + (sample.value ?? 0))
      }
      return Array.from(byDay.entries()).map(([date, steps]) => ({ date, steps: Math.round(steps) }))
    } catch {
      return []
    }
  }, [])

  return {
    enabled,
    loading,
    todaySteps,
    enableHealthConnect,
    refreshSteps,
    getStepsForDateRange,
  }
}
