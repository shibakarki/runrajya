import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DB_NAME = 'RunRajyaOfflineDB'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('traces')) {
        db.createObjectStore('traces', { autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('captures')) {
        db.createObjectStore('captures', { autoIncrement: true })
      }
    }

    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function getAllFromStore(storeName) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = (e) => resolve(e.target.result)
      request.onerror = (e) => reject(e.target.error)
    })
  })
}

function clearStore(storeName) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.clear()
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    })
  })
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  const updatePendingCount = useCallback(async () => {
    try {
      const traces = await getAllFromStore('traces')
      const captures = await getAllFromStore('captures')
      setPendingCount(traces.length + captures.length)
    } catch (err) {
      console.warn('Failed to read offline queue sizes:', err)
    }
  }, [])

  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount])

  const queueTrace = useCallback(async (trace) => {
    try {
      const db = await openDB()
      const tx = db.transaction('traces', 'readwrite')
      tx.objectStore('traces').add(trace)
      await new Promise((res) => tx.oncomplete = res)
      await updatePendingCount()
    } catch (err) {
      console.error('Failed to log trace offline:', err)
    }
  }, [updatePendingCount])

  const queueCapture = useCallback(async (capture) => {
    try {
      const db = await openDB()
      const tx = db.transaction('captures', 'readwrite')
      tx.objectStore('captures').add(capture)
      await new Promise((res) => tx.oncomplete = res)
      await updatePendingCount()
    } catch (err) {
      console.error('Failed to log capture offline:', err)
    }
  }, [updatePendingCount])

  const syncToDatabase = useCallback(async () => {
    if (!navigator.onLine) return
    if (syncing) return

    try {
      const traces = await getAllFromStore('traces')
      const captures = await getAllFromStore('captures')

      if (traces.length === 0 && captures.length === 0) {
        setPendingCount(0)
        return
      }

      setSyncing(true)
      console.log('Initiating sync...', { traces, captures })

      const fetchWithTimeout = (promise, ms = 10000) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Network Sync Timeout')), ms))
        ])
      }

      // 1. Sync Traces
      if (traces.length > 0) {
        await fetchWithTimeout(
          supabase.from('traces').insert(traces).then(({ error }) => {
            if (error) throw error
          })
        )
      }

      // 2. Sync Captures with Conflict Resolution Timestamps & Detailed Error Logging
      if (captures.length > 0) {
        for (const cap of captures) {
          const { data: currentZone, error: fetchError } = await fetchWithTimeout(
            supabase.from('zones').select('captured_at').eq('id', cap.zoneId).single()
          )

          if (fetchError) {
            console.warn(`Failed to fetch current ownership for zone ${cap.zoneId}:`, fetchError.message)
            continue
          }

          const shouldOverwrite = !currentZone?.captured_at || 
            new Date(cap.capturedAt) < new Date(currentZone.captured_at);

          if (shouldOverwrite) {
            const { error: capError } = await fetchWithTimeout(
              supabase.from('zones').update({
                owner_id: cap.userId,
                captured_at: cap.capturedAt,
                contested: cap.contested,
                revealed: true,
              }).eq('id', cap.zoneId)
            )

            // CRUCIAL: Logs exact DB error if RLS or Constraints block the write
            if (capError) {
              console.error(`DATABASE REJECTED CAPTURE for Zone ${cap.zoneId}!`, {
                code: capError.code, // e.g., '42501' for RLS violation
                message: capError.message,
                hint: capError.hint
              })
              throw capError
            }
          }
        }
      }

      // 3. Clear local queues only upon successful database confirmations
      await clearStore('traces')
      await clearStore('captures')
      setPendingCount(0)
      console.log('Offline queue successfully synchronized.')
    } catch (err) {
      console.error('Database synchronization failed or timed out:', err.message)
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true)
      syncToDatabase()
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (navigator.onLine) {
      syncToDatabase()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncToDatabase])

  return { 
    isOnline, 
    syncing, 
    pendingCount, 
    queueTrace, 
    queueCapture, 
    syncToDatabase 
  }
}