import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { WorkoutSession, WorkoutSessionInsert } from '../types'

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWorkouts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(200)

    if (!error && data) {
      setWorkouts(data as WorkoutSession[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchWorkouts()
  }, [fetchWorkouts])

  const upsertWorkouts = useCallback(async (sessions: WorkoutSessionInsert[]) => {
    if (sessions.length === 0) return { error: null }
    const { error } = await supabase
      .from('workout_sessions')
      .upsert(sessions, { onConflict: 'user_id,source_id', ignoreDuplicates: true })
    if (!error) await fetchWorkouts()
    return { error }
  }, [fetchWorkouts])

  const addWorkout = useCallback(async (session: Omit<WorkoutSessionInsert, 'user_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not authenticated') }
    const { error } = await supabase
      .from('workout_sessions')
      .insert({ ...session, user_id: user.id })
    if (!error) await fetchWorkouts()
    return { error }
  }, [fetchWorkouts])

  // Last 7 days for resilience scoring
  const recentWorkouts = workouts.filter(w => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return new Date(w.workout_date) >= sevenDaysAgo
  })

  return { workouts, recentWorkouts, loading, upsertWorkouts, addWorkout, refresh: fetchWorkouts }
}
