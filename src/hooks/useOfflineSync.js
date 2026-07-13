import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Monitor Queue and Online Status
  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    const interval = setInterval(async () => {
      const t = await db.traces.count();
      const c = await db.captures.count();
      setPendingCount(t + c);
    }, 2000);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
      clearInterval(interval);
    };
  }, []);

  const syncData = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);

    try {
      // 1. HIGH PRIORITY: SYNC CAPTURES FIRST
      const captures = await db.captures.limit(20).toArray();
      for (const cap of captures) {
        const { error } = await supabase
          .from('zones')
          .update({ 
            owner_id: cap.user_id, 
            captured_at: cap.captured_at,
            contested: cap.contested,
            revealed: true 
          })
          .eq('id', cap.zone_id);
        
        // If success or if record doesn't exist, remove from offline queue
        if (!error || error.code === 'PGRST116') {
          await db.captures.delete(cap.id);
        }
      }

      // 2. BACKGROUND: BATCH SYNC TRACES (Handles large queues efficiently)
      const traces = await db.traces.limit(100).toArray();
      if (traces.length > 0) {
        const { error } = await supabase.from('traces').insert(
          traces.map(t => ({
            session_id: t.session_id,
            latitude: t.latitude,
            longitude: t.longitude,
            recorded_at: t.recorded_at
          }))
        );
        if (!error) await db.traces.bulkDelete(traces.map(t => t.id));
      }
    } catch (err) {
      console.warn("Sync Interrupted:", err.message);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    if (isOnline) syncData();
  }, [isOnline, syncData]);

  return { 
    isOnline, 
    syncing, 
    pendingCount, 
    queueTrace: (data) => db.traces.add(data),
    queueCapture: (data) => db.captures.add(data)
  };
}