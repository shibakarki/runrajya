import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';

export function useZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAllZonesFromSupabase = async () => {
    let allData = [];
    let from = 0;
    let to = 999;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('zones')
        .select('id, lat_min, lat_max, lng_min, lng_max, owner_id, revealed')
        .range(from, to);

      if (error) {
        console.error("Supabase Grid Fetch Error:", error);
        return [];
      }

      if (data && data.length > 0) {
        allData = [...allData, ...data];
        from += 1000;
        to += 1000;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const loadGridData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Check local IndexedDB (V5) first
      const localCachedZones = await db.zones_grid.toArray();
      
      if (localCachedZones.length > 0) {
        setZones(localCachedZones);
        setLoading(false);
      }

      // 2. Background Sync: Fetch fresh data from Supabase if online
      if (navigator.onLine) {
        const freshZones = await fetchAllZonesFromSupabase();
        if (freshZones.length > 0) {
          // Update local cache
          await db.zones_grid.bulkPut(freshZones);
          setZones(freshZones);
        }
      }
    } catch (err) {
      console.error("Failed to load tactical grid:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGridData();
  }, [loadGridData]);

  const updateZone = async (updatedZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    await db.zones_grid.put(updatedZone);
  };

  return { zones, loading, updateZone };
}