import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Dexie from 'dexie'

// Initialize IndexedDB v2
const db = new Dexie('RunRajyaOfflineDBv2')
db.version(2).stores({
  traces: '++id, session_id, recorded_at',
  captures: '++id, zoneId, userId, capturedAt',
  zones_grid: 'id, revealed, owner_id'
})

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Update pending count every 5 seconds
    const interval = setInterval(async () => {
      const t = await db.traces.count()
      const c = await db.captures.count()
      setPendingCount(t + c)
    }, 5000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  // THE SYNC ENGINE: Prioritizes Captures over Traces
  useEffect(() => {
    if (isOnline && !syncing) {
      syncData()
    }
  }, [isOnline, syncing])

  async function syncData() {
    setSyncing(true)
    try {
      // 1. SYNC CAPTURES FIRST (Critical Priority)
      const captures = await db.captures.toArray()
      for (const cap of captures) {
        const { error } = await supabase
          .from('zones')
          .update({ 
            owner_id: cap.userId, 
            captured_at: cap.capturedAt,
            contested: cap.contested 
          })
          .eq('id', cap.zoneId)
        
        if (!error || error.code === 'PGRST116') {
          await db.captures.delete(cap.id)
        }
      }

      // 2. SYNC TRACES SECOND (Batching to handle large queues)
      const traces = await db.traces.limit(50).toArray()
      if (traces.length > 0) {
        const { error } = await supabase.from('traces').insert(
          traces.map(t => ({
            session_id: t.session_id,
            latitude: t.latitude,
            longitude: t.longitude,
            recorded_at: t.recorded_at
          }))
        )
        if (!error) {
          const ids = traces.map(t => t.id)
          await db.traces.bulkDelete(ids)
        }
      }
    } catch (err) {
      console.error("Sync Error:", err)
    } finally {
      setSyncing(false)
    }
  }

  const queueTrace = async (trace) => {
    await db.traces.add(trace)
  }

  const queueCapture = async (capture) => {
    await db.captures.add(capture)
  }

  return { isOnline, syncing, pendingCount, queueTrace, queueCapture, db }
}