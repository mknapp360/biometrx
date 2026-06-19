import { useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'

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

export function useHealthConnect() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(false)

  const checkAvailability = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const Health = await getHealthPlugin()
      const result = await Health.isAvailable()
      setIsAvailable(result.available)
      return result.available
    } catch {
      setIsAvailable(false)
      return false
    }
  }, [])

  const requestAccess = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      const Health = await getHealthPlugin()
      const result = await Health.requestAuthorization({
        read: ['steps'],
        write: [],
      })
      setIsAuthorized(result.authorized)
      return result.authorized
    } catch {
      setIsAuthorized(false)
      return false
    }
  }, [])

  const getTodaySteps = useCallback(async (): Promise<number | null> => {
    if (!Capacitor.isNativePlatform()) return null
    try {
      const Health = await getHealthPlugin()
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const result = await Health.queryAggregated({
        startDate: startOfDay.toISOString(),
        endDate: now.toISOString(),
        dataType: 'steps',
      })
      return result.value ?? null
    } catch {
      return null
    }
  }, [])

  const getStepsForDateRange = useCallback(async (
    startDate: Date,
    endDate: Date
  ): Promise<StepsData[]> => {
    if (!Capacitor.isNativePlatform()) return []
    try {
      const Health = await getHealthPlugin()
      const result = await Health.query({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataType: 'steps',
      })
      // Group by day
      const byDay = new Map<string, number>()
      for (const record of result.records ?? []) {
        const day = record.startDate.split('T')[0]
        byDay.set(day, (byDay.get(day) ?? 0) + (record.value ?? 0))
      }
      return Array.from(byDay.entries()).map(([date, steps]) => ({ date, steps }))
    } catch {
      return []
    }
  }, [])

  const syncTodaySteps = useCallback(async (): Promise<number | null> => {
    setLoading(true)
    try {
      const available = await checkAvailability()
      if (!available) return null

      const authorized = await requestAccess()
      if (!authorized) return null

      return await getTodaySteps()
    } finally {
      setLoading(false)
    }
  }, [checkAvailability, requestAccess, getTodaySteps])

  return {
    isAvailable,
    isAuthorized,
    loading,
    checkAvailability,
    requestAccess,
    getTodaySteps,
    getStepsForDateRange,
    syncTodaySteps,
  }
}
