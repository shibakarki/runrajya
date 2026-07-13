import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from './useOfflineSync';

export function useZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initZones() {
      // 1. Load from Local Cache
      const cached = await db.zones_grid.toArray();
      if (cached.length > 0) {
        setZones(cached);
        setLoading(false);
      }

      // 2. Fetch Fresh Data from Supabase
      const { data, error } = await supabase
        .from('zones')
        .select('id, lat_min, lat_max, lng_min, lng_max, owner_id, revealed');

      if (!error && data) {
        await db.zones_grid.bulkPut(data);
        setZones(data);
      }
      setLoading(false);
    }
    initZones();
  }, []);

  const updateZoneLocally = async (updatedZone) => {
    setZones(prev => prev.map(z => z.id === updatedZone.id ? updatedZone : z));
    await db.zones_grid.put(updatedZone);
  };

  return { zones, loading, updateZoneLocally };
}