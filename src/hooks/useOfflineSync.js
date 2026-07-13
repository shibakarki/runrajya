import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Dexie from 'dexie'

// 1. Initialize and EXPORT the database instance
export const db = new Dexie('RunRajyaOfflineDBv2')

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

    const interval = setInterval(async () => {
      const t = await db.traces.count()
      const c = await db.captures.count()
      setPendingCount(t + c)
    }, 3000)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (isOnline && !syncing) {
      syncData()
    }
  }, [isOnline, syncing])

  async function syncData() {
    const captureCount = await db.captures.count()
    const traceCount = await db.traces.count()
    if (captureCount === 0 && traceCount === 0) return

    setSyncing(true)
    try {
      // Priority 1: Captures
      const captures = await db.captures.limit(10).toArray()
      for (const cap of captures) {
        const { error } = await supabase
          .from('zones')
          .update({ 
            owner_id: cap.userId, 
            captured_at: cap.capturedAt,
            contested: cap.contested 
          })
          .eq('id', cap.zoneId)
        
        if (!error) await db.captures.delete(cap.id)
      }

      // Priority 2: Traces (Batching 50 at a time)
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
          await db.traces.bulkDelete(traces.map(t => t.id))
        }
      }
    } catch (err) {
      console.error("Sync Logic Error:", err)
    } finally {
      setSyncing(false)
    }
  }

  const queueTrace = async (trace) => await db.traces.add(trace)
  const queueCapture = async (capture) => await db.captures.add(capture)

  return { isOnline, syncing, pendingCount, queueTrace, queueCapture }
}