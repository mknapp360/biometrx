import { useCallback } from 'react'
import { Health, type Workout } from '@capgo/capacitor-health'
import { supabase } from '../lib/supabase'
import { classifyWorkout } from '../utils/workoutClassification'
import type { WorkoutSessionInsert } from '../types'

const LAST_SYNC_KEY = 'workout_last_sync'
const INITIAL_LOOKBACK_DAYS = 90

function buildSourceId(w: Workout): string {
  return w.platformId ?? `${w.startDate}-${w.endDate}-${w.workoutType}`
}

export function useWorkoutSync() {
  const sync = useCallback(async (): Promise<{ synced: number; error: string | null }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { synced: 0, error: 'Not authenticated' }

      const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY)
      const startDate = lastSyncStr
        ? new Date(lastSyncStr).toISOString()
        : new Date(Date.now() - INITIAL_LOOKBACK_DAYS * 86400_000).toISOString()
      const endDate = new Date().toISOString()

      const result = await Health.queryWorkouts({ startDate, endDate, limit: 500 })

      const sessions = result.workouts ?? []
      if (sessions.length === 0) {
        localStorage.setItem(LAST_SYNC_KEY, endDate)
        return { synced: 0, error: null }
      }

      const inserts: WorkoutSessionInsert[] = sessions.map((w: Workout) => {
        const start = new Date(w.startDate)
        const durationMin = Math.max(1, Math.round((w.duration ?? 0) / 60))
        const workoutDate = start.toISOString().slice(0, 10)

        return {
          user_id: user.id,
          source_id: buildSourceId(w),
          workout_date: workoutDate,
          start_time: w.startDate,
          end_time: w.endDate,
          duration_min: durationMin,
          workout_type: w.workoutType,
          biometrx_category: classifyWorkout(w.workoutType),
          distance_m: w.totalDistance != null ? Number(w.totalDistance) : null,
          calories_burned: w.totalEnergyBurned != null ? Math.round(Number(w.totalEnergyBurned)) : null,
          avg_heart_rate: null,
          max_heart_rate: null,
          source_app: w.sourceName ?? null,
          notes: null,
        }
      })

      const { error } = await supabase
        .from('workout_sessions')
        .upsert(inserts, { onConflict: 'user_id,source_id', ignoreDuplicates: true })

      if (error) return { synced: 0, error: error.message }

      localStorage.setItem(LAST_SYNC_KEY, endDate)
      return { synced: inserts.length, error: null }
    } catch (e) {
      return { synced: 0, error: String(e) }
    }
  }, [])

  const resetSyncTimestamp = useCallback(() => {
    localStorage.removeItem(LAST_SYNC_KEY)
  }, [])

  return { sync, resetSyncTimestamp }
}
