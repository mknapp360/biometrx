import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { HealthReading, HealthReadingInsert, HealthReadingUpdate } from '../types'
import { calculateMAP, calculatePulsePressure } from '../utils/calculations'

export function useReadings() {
  const { user } = useAuth()
  const [readings, setReadings] = useState<HealthReading[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReadings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('health_readings')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })

    if (!error && data) {
      setReadings(data as HealthReading[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchReadings()
  }, [fetchReadings])

  const addReading = async (reading: Omit<HealthReadingInsert, 'user_id' | 'map' | 'pulse_pressure'>) => {
    if (!user) return { error: new Error('Not authenticated') }

    const hasBP = reading.systolic != null && reading.diastolic != null
    const map = hasBP ? calculateMAP(reading.systolic!, reading.diastolic!) : null
    const pulse_pressure = hasBP ? calculatePulsePressure(reading.systolic!, reading.diastolic!) : null

    const payload = {
      ...reading,
      user_id: user.id,
      map,
      pulse_pressure,
    }

    console.log('[BioMetRx] Inserting reading:', payload)
    const { data, error } = await supabase.from('health_readings').insert(payload).select()

    if (error) {
      console.error('[BioMetRx] Insert failed:', error.message, error.details, error.hint)
      return { error }
    }

    if (!data || data.length === 0) {
      console.error('[BioMetRx] Insert returned no data — likely RLS rejection')
      return { error: new Error('Reading was not saved. Please sign out and sign back in.') }
    }

    console.log('[BioMetRx] Insert success:', data)
    await fetchReadings()
    return { error: null }
  }

  const updateReading = async (id: string, updates: HealthReadingUpdate) => {
    const hasBP = updates.systolic != null && updates.diastolic != null
    const map = hasBP ? calculateMAP(updates.systolic!, updates.diastolic!) : undefined
    const pulse_pressure = hasBP ? calculatePulsePressure(updates.systolic!, updates.diastolic!) : undefined

    const { error } = await supabase
      .from('health_readings')
      .update({ ...updates, ...(map !== undefined ? { map, pulse_pressure } : {}) })
      .eq('id', id)

    if (!error) await fetchReadings()
    return { error }
  }

  const deleteReading = async (id: string) => {
    const { error } = await supabase
      .from('health_readings')
      .delete()
      .eq('id', id)

    if (!error) await fetchReadings()
    return { error }
  }

  return { readings, loading, addReading, updateReading, deleteReading, refetch: fetchReadings }
}
