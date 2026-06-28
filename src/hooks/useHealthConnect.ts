import { useState, useCallback, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Health } from '@capgo/capacitor-health'

const HC_ENABLED_KEY = 'biometrx_health_connect_enabled'

export interface StepsData {
  date: string
  steps: number
}

export interface SleepStages {
  deepMin: number
  remMin: number
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
  const [todayHRV, setTodayHRV] = useState<number | null>(null)
  const [lastNightSleep, setLastNightSleep] = useState<SleepStages | null>(null)
  const [latestVO2Max, setLatestVO2Max] = useState<number | null>(null)

  const ensureAuthorized = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const avail = await Health.isAvailable()
      if (!avail.available) return false

      const result = await Health.requestAuthorization({
        read: ['steps', 'heartRate', 'heartRateVariability', 'sleep', 'vo2Max', 'workouts'],
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

  const fetchTodayHRV = useCallback(async (): Promise<number | null> => {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const result = await Health.queryAggregated({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        dataType: 'heartRateVariability',
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

  const fetchLastNightSleep = useCallback(async (): Promise<SleepStages | null> => {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const now = new Date()
      // Last night: 8pm yesterday → noon today
      const yesterday8pm = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 20, 0, 0)
      const todayNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0)

      const result = await Health.readSamples({
        startDate: yesterday8pm.toISOString(),
        endDate: todayNoon.toISOString(),
        dataType: 'sleep',
      })

      let deepMin = 0
      let remMin = 0

      for (const sample of result.samples ?? []) {
        if (sample.stages && sample.stages.length > 0) {
          // Nested stage data (some devices/apps)
          for (const stage of sample.stages) {
            if (stage.stage === 'deep') deepMin += Math.round(stage.durationMinutes)
            else if (stage.stage === 'rem') remMin += Math.round(stage.durationMinutes)
          }
        } else {
          // Flat sample per stage segment
          const durationMin = Math.round(
            (new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / 60000
          )
          if (sample.sleepState === 'deep') deepMin += durationMin
          else if (sample.sleepState === 'rem') remMin += durationMin
        }
      }

      if (deepMin === 0 && remMin === 0) return null
      return { deepMin, remMin }
    } catch {
      return null
    }
  }, [])

  const fetchLatestVO2Max = useCallback(async (): Promise<number | null> => {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const now = new Date()
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const result = await Health.readSamples({
        startDate: ninetyDaysAgo.toISOString(),
        endDate: now.toISOString(),
        dataType: 'vo2Max',
        limit: 1,
      })
      const samples = result.samples ?? []
      if (samples.length === 0) return null
      return Math.round(samples[0]!.value * 10) / 10
    } catch {
      return null
    }
  }, [])

  const enableHealthConnect = useCallback(async (): Promise<number | null> => {
    setLoading(true)
    try {
      const authorized = await ensureAuthorized()
      if (!authorized) return null

      setEnabled(true)
      setEnabledState(true)

      const [steps, hr, hrv, sleep, vo2] = await Promise.all([
        fetchTodaySteps(),
        fetchTodayHeartRate(),
        fetchTodayHRV(),
        fetchLastNightSleep(),
        fetchLatestVO2Max(),
      ])
      setTodaySteps(steps)
      setTodayHeartRate(hr)
      setTodayHRV(hrv)
      setLastNightSleep(sleep)
      setLatestVO2Max(vo2)
      return steps
    } finally {
      setLoading(false)
    }
  }, [ensureAuthorized, fetchTodaySteps, fetchTodayHeartRate, fetchTodayHRV, fetchLastNightSleep, fetchLatestVO2Max])

  const disableHealthConnect = useCallback(() => {
    setEnabled(false)
    setEnabledState(false)
    setTodaySteps(null)
    setTodayHeartRate(null)
    setTodayHRV(null)
    setLastNightSleep(null)
    setLatestVO2Max(null)
  }, [])

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return
    let cancelled = false

    const sync = async (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      try {
        const authorized = await ensureAuthorized()
        if (!authorized || cancelled) return

        const [steps, hr, hrv, sleep, vo2] = await Promise.all([
          fetchTodaySteps(),
          fetchTodayHeartRate(),
          fetchTodayHRV(),
          fetchLastNightSleep(),
          fetchLatestVO2Max(),
        ])
        if (!cancelled) {
          setTodaySteps(steps)
          setTodayHeartRate(hr)
          setTodayHRV(hrv)
          setLastNightSleep(sleep)
          setLatestVO2Max(vo2)
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
  }, [enabled, ensureAuthorized, fetchTodaySteps, fetchTodayHeartRate, fetchTodayHRV, fetchLastNightSleep, fetchLatestVO2Max])

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return

    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) return
      Promise.all([
        fetchTodaySteps(),
        fetchTodayHeartRate(),
        fetchTodayHRV(),
        fetchLastNightSleep(),
        fetchLatestVO2Max(),
      ]).then(([steps, hr, hrv, sleep, vo2]) => {
        setTodaySteps(steps)
        setTodayHeartRate(hr)
        setTodayHRV(hrv)
        setLastNightSleep(sleep)
        setLatestVO2Max(vo2)
      })
    })

    return () => { listener.then(h => h.remove()) }
  }, [enabled, fetchTodaySteps, fetchTodayHeartRate, fetchTodayHRV, fetchLastNightSleep, fetchLatestVO2Max])

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
    todayHRV,
    lastNightSleep,
    latestVO2Max,
    enableHealthConnect,
    disableHealthConnect,
    openSettings,
    getStepsForDateRange,
  }
}
