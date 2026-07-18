import { MapContainer, TileLayer, Marker, ZoomControl } from 'react-leaflet';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useZones } from '../hooks/useZones';
import { useGPS } from '../hooks/useGPS';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { db } from '../lib/db';
import rupandehiBoundary from '../data/rupandehi_boundary.json';

// Modular Imports
{/* Assuming these are in components folder */}
import TacticalMask from '../components/Map/TacticalMask';
import AthleticConsole from '../components/HUD/AthleticConsole';
import PocketLock from '../components/Overlays/PocketLock'; 

export default function MapPage() {
  const { profile } = useAuth();
  const { zones, updateZone } = useZones();
  const { isOnline, pendingCount, queueTrace, queueCapture } = useOfflineSync();
  
  const [sessionActive, setSessionActive] = useState(false);
  const { position, distance, heading, error } = useGPS(sessionActive);
  
  const [stats, setStats] = useState({ points: 0, zonesCount: 0 });
  const [pocketMode, setPocketMode] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);

  // Capture Engine Function (Isolated for debugging)
  const processCaptures = () => {
    if (!position || !sessionActive) return;
    zones.forEach(zone => {
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max;
      if (inside && zone.owner_id !== profile.id) {
        updateZone({ ...zone, owner_id: profile.id, revealed: true });
        setStats(s => ({ points: s.points + 10, zonesCount: s.zonesCount + 1 }));
        queueCapture({ zone_id: zone.id, user_id: profile.id, captured_at: new Date().toISOString() });
      }
    });
  };

  useEffect(processCaptures, [position]);

  return (
    <div className="flex flex-col h-full w-full">
      <div className="h-[65%] w-full relative">
        <MapContainer center={[27.55, 83.42]} zoom={15} style={{ height: '100%' }} zoomControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <TacticalMask boundaryData={rupandehiBoundary} />
          {/* ... markers logic */}
          <ZoomControl position="bottomleft" />
        </MapContainer>
      </div>

      <div className="h-[35%] w-full bg-[#0f1020] p-6 z-20">
        <AthleticConsole 
          sessionActive={sessionActive}
          metrics={{ distance, ...stats, color: profile?.color }}
          syncData={{ isOnline, pendingCount }}
          autoCenter={autoCenter}
          setAutoCenter={setAutoCenter}
          onAction={() => setSessionActive(!sessionActive)}
          onLock={() => setPocketMode(true)}
        />
      </div>

      {pocketMode && <PocketLock distance={distance} onUnlock={() => setPocketMode(false)} />}
    </div>
  );
}