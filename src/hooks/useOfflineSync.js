import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    
    const countQueue = setInterval(async () => {
      const t = await db.traces.count();
      const c = await db.captures.count();
      setPendingCount(t + c);
    }, 3000);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      clearInterval(countQueue);
    };
  }, []);

  const performAtomicSync = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);

    try {
      // 1. SYNC CAPTURES (High Priority)
      const captures = await db.captures.limit(20).toArray();
      for (const cap of captures) {
        const { error } = await supabase.from('zones').update({
          owner_id: cap.user_id,
          captured_at: cap.captured_at,
          contested: cap.contested
        }).eq('id', cap.zone_id);

        // Atomic Purge: Only delete if Supabase confirmed receipt
        if (!error) await db.captures.delete(cap.id);
      }

      // 2. SYNC TRACES (Batch Insert)
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

        // Atomic Purge: Batch delete on success
        if (!error) {
          await db.traces.bulkDelete(traces.map(t => t.id));
        }
      }
    } catch (err) {
      console.warn("Atomic Sync Failure:", err.message);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    if (isOnline) performAtomicSync();
  }, [isOnline, performAtomicSync]);

  return { isOnline, syncing, pendingCount };
}