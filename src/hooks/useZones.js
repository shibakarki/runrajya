import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useZones() {
  const [zones, setZones] = useState([])

  const updateZone = useCallback((updatedZone) => {
    setZones(prev =>
      prev.map(z => z.id === updatedZone.id ? { ...z, ...updatedZone } : z)
    )
  }, [])

  useEffect(() => {
    async function fetchAllZones() {
      let allZones = []
      let from = 0
      const batchSize = 1000

      while (true) {
        const { data, error } = await supabase
          .from('zones')
          .select('*')
          .range(from, from + batchSize - 1)

        if (error) { console.error(error); break }
        if (!data || data.length === 0) break

        allZones = [...allZones, ...data]
        if (data.length < batchSize) break
        from += batchSize
      }

      console.log('Total zones loaded:', allZones.length)
      setZones(allZones)
    }

    fetchAllZones()

    const channel = supabase
      .channel('zones-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'zones' },
        payload => {
          console.log('Realtime zone update:', payload.new.id)
          setZones(prev =>
            prev.map(z => z.id === payload.new.id ? { ...z, ...payload.new } : z)
          )
        }
      )
      .subscribe(status => {
        console.log('Realtime status:', status)
      })

    return () => supabase.removeChannel(channel)
  }, [])

  return { zones, updateZone }
}