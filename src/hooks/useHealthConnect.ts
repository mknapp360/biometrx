import { useState, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Health } from '@capgo/capacitor-health'

const HC_ENABLED_KEY = 'biometrx_health_connect_enabled'

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
  const [todayHeartRate, setTodayHeartRate] = useState<number | null>(null)

  const ensureAuthorized = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const avail = await Health.isAvailable()
      if (!avail.available) return false

      const result = await Health.requestAuthorization({
        read: ['steps', 'heartRate'],
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
      return Math.round(samples[0]!.value)
    } catch {
      return null
    }
  }, [])

  const fetchTodayHeartRate = useCallback(async (): Promise<number | null> => {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const result = await Health.queryAggregated({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        dataType: 'heartRate',
        bucket: 'day',
        aggregation: 'average',
      })
      const samples = result.samples ?? []
      if (samples.length === 0) return null
      return Math.round(samples[0]!.value)
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

      const [steps, hr] = await Promise.all([fetchTodaySteps(), fetchTodayHeartRate()])
      setTodaySteps(steps)
      setTodayHeartRate(hr)
      return steps
    } finally {
      setLoading(false)
    }
  }, [ensureAuthorized, fetchTodaySteps, fetchTodayHeartRate])

  // Disable Health Connect
  const disableHealthConnect = useCallback(() => {
    setEnabled(false)
    setEnabledState(false)
    setTodaySteps(null)
    setTodayHeartRate(null)
  }, [])

  // Auto-fetch on mount and poll every 5 minutes if enabled
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return
    let cancelled = false

    const sync = async (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      try {
        const authorized = await ensureAuthorized()
        if (!authorized || cancelled) return

        const [steps, hr] = await Promise.all([fetchTodaySteps(), fetchTodayHeartRate()])
        if (!cancelled) {
          setTodaySteps(steps)
          setTodayHeartRate(hr)
        }
      } finally {
        if (!cancelled && showLoading) setLoading(false)
      }
    }

    sync(true)
    const interval = setInterval(() => sync(false), 5 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [enabled, ensureAuthorized, fetchTodaySteps, fetchTodayHeartRate])

  // Re-fetch when app comes back to foreground
  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      Promise.all([fetchTodaySteps(), fetchTodayHeartRate()]).then(([steps, hr]) => {
        setTodaySteps(steps)
        setTodayHeartRate(hr)
      })
    })

    return () => { listener.then(h => h.remove()) }
  }, [enabled, fetchTodaySteps, fetchTodayHeartRate])

  const getStepsForDateRange = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<StepsData[]> => {
    if (!Capacitor.isNativePlatform()) return []
    try {
      const result = await Health.readSamples({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataType: 'steps',
      })
      const byDay = new Map<string, number>()
      for (const sample of result.samples ?? []) {
        const day = sample.startDate.split('T')[0] ?? ''
        byDay.set(day, (byDay.get(day) ?? 0) + (sample.value ?? 0))
      }
      return Array.from(byDay.entries()).map(([date, steps]) => ({ date, steps: Math.round(steps) }))
    } catch {
      return []
    }
  }, [])

  const openSettings = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Health.openHealthConnectSettings()
    } catch { /* ignore */ }
  }, [])

  return {
    enabled,
    loading,
    todaySteps,
    todayHeartRate,
    enableHealthConnect,
    disableHealthConnect,
    openSettings,
    getStepsForDateRange,
  }
}
