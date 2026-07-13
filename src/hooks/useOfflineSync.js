import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Dexie from 'dexie';

// Initialize IndexedDB
export const db = new Dexie('RunRajyaDB');
db.version(3).stores({
  traces: '++id, session_id, recorded_at',
  captures: '++id, zone_id, user_id, captured_at',
  zones_grid: 'id, revealed, owner_id' // Local cache of the map
});

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    const countInterval = setInterval(async () => {
      const t = await db.traces.count();
      const c = await db.captures.count();
      setPendingCount(t + c);
    }, 2000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(countInterval);
    };
  }, []);

  const syncData = useCallback(async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);

    try {
      // PRIORITY 1: Territory Captures
      const pendingCaptures = await db.captures.limit(20).toArray();
      for (const cap of pendingCaptures) {
        const { error } = await supabase
          .from('zones')
          .update({ 
            owner_id: cap.user_id, 
            captured_at: cap.captured_at,
            contested: cap.contested 
          })
          .eq('id', cap.zone_id);
        
        if (!error) await db.captures.delete(cap.id);
      }

      // PRIORITY 2: GPS Traces (Batch Upload)
      const pendingTraces = await db.traces.limit(100).toArray();
      if (pendingTraces.length > 0) {
        const { error } = await supabase.from('traces').insert(
          pendingTraces.map(t => ({
            session_id: t.session_id,
            latitude: t.latitude,
            longitude: t.longitude,
            recorded_at: t.recorded_at
          }))
        );
        if (!error) await db.traces.bulkDelete(pendingTraces.map(t => t.id));
      }
    } catch (err) {
      console.error("Sync Error:", err);
    } finally {
      setSyncing(false);
    }
  }, [isOnline, syncing]);

  useEffect(() => {
    const syncInterval = setInterval(syncData, 5000);
    return () => clearInterval(syncInterval);
  }, [syncData]);

  return {
    isOnline,
    syncing,
    pendingCount,
    queueTrace: (t) => db.traces.add(t),
    queueCapture: (c) => db.captures.add(c)
  };
}