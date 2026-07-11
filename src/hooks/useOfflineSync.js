import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DB_NAME = 'RunRajyaOfflineDB'
const DB_VERSION = 1

// Helper: Open the browser's transactional IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (e) => {
      const db = e.target.result
      // Create independent high-capacity stores for paths and conquests
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

// Helper: Add an item to a store
function addToStore(storeName, item) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite')
      const store = tx.objectStore(storeName)
      store.add(item)
      tx.oncomplete = () => resolve()
      tx.onerror = (e) => reject(e.target.error)
    })
  })
}

// Helper: Retrieve all items from a store
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

// Helper: Clear a store
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

  // Recalculates the total offline queue count
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

  // Queues GPS trace coordinate to IndexedDB
  const queueTrace = useCallback(async (trace) => {
    try {
      await addToStore('traces', trace)
      await updatePendingCount()
    } catch (err) {
      console.error('Failed to log trace offline:', err)
    }
  }, [updatePendingCount])

  // Queues zone capture event to IndexedDB
  const queueCapture = useCallback(async (capture) => {
    try {
      await addToStore('captures', capture)
      await updatePendingCount()
    } catch (err) {
      console.error('Failed to log capture offline:', err)
    }
  }, [updatePendingCount])

  // Syncs all stored queues to Supabase
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
      console.log('Initiating high-capacity synchronization to Supabase...', { traces, captures })

      // 1. Sync Traces
      if (traces.length > 0) {
        const { error: traceError } = await supabase
          .from('traces')
          .insert(traces)

        if (traceError) throw traceError
      }

      // 2. Sync Captures with Conflict Resolution Timestamps
      if (captures.length > 0) {
        for (const cap of captures) {
          const { data: currentZone } = await supabase
            .from('zones')
            .select('captured_at')
            .eq('id', cap.zoneId)
            .single()

          const shouldOverwrite = !currentZone?.captured_at || 
            new Date(cap.capturedAt) < new Date(currentZone.captured_at);

          if (shouldOverwrite) {
            const { error: capError } = await supabase
              .from('zones')
              .update({
                owner_id: cap.userId,
                captured_at: cap.capturedAt,
                contested: cap.contested,
                revealed: true,
              })
              .eq('id', cap.zoneId)

            if (capError) {
              console.warn(`Failed to sync capture for zone ${cap.zoneId}:`, capError.message)
            }
          } else {
            console.log(`Skipping sync for zone ${cap.zoneId} — already claimed by an earlier runner.`)
          }
        }
      }

      // 3. Clear local queues only upon successful database confirmations
      await clearStore('traces')
      await clearStore('captures')
      setPendingCount(0)
      console.log('Offline queue successfully synchronized.')
    } catch (err) {
      console.error('Database synchronization failed:', err)
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