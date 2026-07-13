import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { openDB } from './useOfflineSync'

export function useZones() {
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)

  // 1. Recursive helper to fetch all 4,814 rows beyond Supabase's 1000 limit
  const fetchAllSupabaseZones = async () => {
    let allZones = []
    let currentRangeStart = 0
    let currentRangeEnd = 999
    let keepFetching = true

    while (keepFetching) {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .range(currentRangeStart, currentRangeEnd)

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        allZones = [...allZones, ...data]
        currentRangeStart += 1000
        currentRangeEnd += 1000
      } else {
        keepFetching = false
      }
    }
    return allZones
  }

  // 2. Load the grid (online fetch ➔ cache, or offline read from IndexedDB)
  const loadGridData = useCallback(async () => {
    try {
      const db = await openDB()
      
      // Read local IndexedDB cache first
      const txRead = db.transaction('zones_grid', 'readonly')
      const localCachedZones = await new Promise((res) => {
        txRead.objectStore('zones_grid').getAll().onsuccess = (e) => res(e.target.result)
      })

      if (navigator.onLine) {
        // If online, fetch fresh data from Supabase
        console.log('Online — Fetching 4,814 zones from Supabase...')
        const supabaseZones = await fetchAllSupabaseZones()

        if (supabaseZones.length > 0) {
          // Write fresh zones directly to local IndexedDB.zones_grid
          const txWrite = db.transaction('zones_grid', 'readwrite')
          const store = txWrite.objectStore('zones_grid')
          store.clear() // Clear old data first
          
          supabaseZones.forEach(zone => {
            store.put(zone)
          })
          
          await new Promise((res) => txWrite.oncomplete = res)
          setZones(supabaseZones)
          console.log('Successfully cached 4,814 zones to local IndexedDB.')
        } else {
          setZones(localCachedZones)
        }
      } else {
        // If offline, serve the local IndexedDB grid cache immediately!
        console.log(`Offline — Serving ${localCachedZones.length} cached zones from IndexedDB.`)
        setZones(localCachedZones)
      }
    } catch (err) {
      console.warn('Failed to load grid boundaries:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGridData()

    // Listen to reconnection to re-sync fresh ownership data
    window.addEventListener('online', loadGridData)
    return () => window.removeEventListener('online', loadGridData)
  }, [loadGridData])

  // 3. Optimistic local updater to instantly repaint grid cells on the phone screen
  const updateZone = useCallback(async (updatedZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z))
    
    // Save the painted state to your phone's IndexedDB zones_grid immediately
    try {
      const db = await openDB()
      const tx = db.transaction('zones_grid', 'readwrite')
      tx.objectStore('zones_grid').put(updatedZone)
    } catch (err) {
      console.warn('Failed to cache optimistic update locally:', err)
    }
  }, [])

  return { zones, loading, updateZone, reloadGrid: loadGridData }
}