import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { BloodPanel, BloodPanelInsert, BloodPanelUpdate } from '../types'

export function useBloodPanels() {
  const { user } = useAuth()
  const [panels, setPanels] = useState<BloodPanel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPanels = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('blood_panels')
      .select('*')
      .eq('user_id', user.id)
      .order('test_date', { ascending: false })

    if (!error && data) {
      setPanels(data as BloodPanel[])
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchPanels()
  }, [fetchPanels])

  const addPanel = async (panel: Omit<BloodPanelInsert, 'user_id'>) => {
    if (!user) return { error: new Error('Not authenticated') }

    const { data, error } = await supabase
      .from('blood_panels')
      .insert({ ...panel, user_id: user.id })
      .select()

    if (error) {
      console.error('[BiometRx] Blood panel insert failed:', error.message)
      return { error }
    }
    if (!data || data.length === 0) {
      return { error: new Error('Panel was not saved.') }
    }
    await fetchPanels()
    return { error: null }
  }

  const updatePanel = async (id: string, updates: BloodPanelUpdate) => {
    const { error } = await supabase
      .from('blood_panels')
      .update(updates)
      .eq('id', id)

    if (!error) await fetchPanels()
    return { error }
  }

  const deletePanel = async (id: string) => {
    const { error } = await supabase
      .from('blood_panels')
      .delete()
      .eq('id', id)

    if (!error) await fetchPanels()
    return { error }
  }

  return { panels, loading, addPanel, updatePanel, deletePanel, refetch: fetchPanels }
}
