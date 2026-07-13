import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

export function useZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGrid = useCallback(async () => {
    // 1. Instant Load from IndexedDB
    const cached = await db.zones_grid.toArray();
    if (cached.length > 0) {
      setZones(cached);
      setLoading(false);
    }

    if (navigator.onLine) {
      // 2. Background update from Supabase (Handles 1000+ limit)
      let allZones = [];
      let start = 0;
      while (true) {
        const { data, error } = await supabase.from('zones').select('*').range(start, start + 999);
        if (error || !data || data.length === 0) break;
        allZones = [...allZones, ...data];
        start += 1000;
      }
      
      if (allZones.length > 0) {
        await db.zones_grid.bulkPut(allZones);
        setZones(allZones);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const updateZone = async (zone) => {
    // UI Update
    setZones(prev => prev.map(z => z.id === zone.id ? zone : z));
    // Local DB Update
    await db.zones_grid.put(zone);
  };

  return { zones, loading, updateZone };
}