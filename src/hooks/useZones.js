import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { db } from './useOfflineSync' // Import the shared Dexie instance

export function useZones() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Load zones from IndexedDB or Supabase
  useEffect(() => {
    async function loadZones() {
      try {
        // Try local cache first
        const localZones = await db.zones_grid.toArray()
        
        if (localZones.length > 0) {
          setZones(localZones)
          setLoading(false)
        }

        // Fetch fresh data from Supabase
        const { data, error } = await supabase
          .from('zones')
          .select('id, lat_min, lat_max, lng_min, lng_max, owner_id, revealed')

        if (!error && data) {
          // Update local cache
          await db.zones_grid.bulkPut(data)
          setZones(data)
        }
      } catch (err) {
        console.error("Failed to load zones:", err)
      } finally {
        setLoading(false)
      }
    }

    loadZones()
  }, [])

  // 2. Function to update a zone locally (Optimistic UI)
  const updateZone = async (updatedZone) => {
    // Update State (UI)
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z))
    
    // Update IndexedDB (Persistence)
    try {
      await db.zones_grid.put(updatedZone)
    } catch (err) {
      console.error("Local DB update failed:", err)
    }
  }

  return { zones, loading, updateZone }
}