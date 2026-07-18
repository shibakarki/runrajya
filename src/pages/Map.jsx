import { MapContainer, TileLayer, Marker, ZoomControl, Rectangle, useMap } from 'react-leaflet';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useZones } from '../hooks/useZones';
import { useGPS } from '../hooks/useGPS';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { db } from '../lib/db';
import rupandehiBoundary from '../data/rupandehi_boundary.json';
import L from 'leaflet';

// Modular Components
import TacticalMask from '../components/Map/TacticalMask';
import AthleticConsole from '../components/HUD/AthleticConsole';
import PocketLock from '../components/Overlays/PocketLock';

function MapAutoCenter({ position, autoCenter }) {
  const map = useMap();
  useEffect(() => {
    if (position && autoCenter) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [position, autoCenter, map]);
  return null;
}

export default function MapPage() {
  const { profile, user } = useAuth();
  const userId = profile?.id || user?.id;
  const { zones, updateZone } = useZones();
  const { isOnline, pendingCount, queueTrace, queueCapture } = useOfflineSync();
  
  const [sessionActive, setSessionActive] = useState(false);
  const { position, distance, heading, error, requestCompass } = useGPS(sessionActive);
  
  const [stats, setStats] = useState({ points: 0, zonesCount: 0 });
  const [pocketMode, setPocketMode] = useState(false);
  const [autoCenter, setAutoCenter] = useState(true);

  // Capture Logic
  useEffect(() => {
    if (!position || !sessionActive || !userId) return;
    zones.forEach(zone => {
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max;
      if (inside && zone.owner_id !== userId) {
        const contested = zone.owner_id !== null;
        updateZone({ ...zone, owner_id: userId, revealed: true });
        setStats(s => ({ points: s.points + (contested ? 25 : 10), zonesCount: s.zonesCount + 1 }));
        queueCapture({ zone_id: zone.id, user_id: userId, captured_at: new Date().toISOString(), contested });
      }
    });
    queueTrace({ latitude: position.lat, longitude: position.lng, recorded_at: new Date().toISOString() });
  }, [position]);

  const compassIcon = useMemo(() => {
    if (!position) return null;
    const color = profile?.color || '#3b82f6';
    return L.divIcon({
      className: 't-icon',
      html: `<div style="transform:rotate(${heading}deg);width:14px;height:14px;background:white;border-radius:50%;border:3px solid ${color};"></div>`
    });
  }, [position, heading, profile]);

  return (
    <div className="flex flex-col h-full w-full bg-[#080810] fixed inset-0 overflow-hidden">
      <div className="h-[65%] w-full relative border-b border-[#1e2042]">
        <MapContainer center={[27.55, 83.42]} zoom={15} style={{ height: '100%' }} zoomControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <TacticalMask boundaryData={rupandehiBoundary} />
          {zones.filter(z => z.revealed).map(zone => (
            <Rectangle key={zone.id} bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]} 
              pathOptions={{ fillColor: zone.owner_id ? (zone.owner_id === userId ? profile?.color : '#ff4757') : '#fff', fillOpacity: 0.3, weight: 0.5 }} />
          ))}
          {position && <Marker position={[position.lat, position.lng]} icon={compassIcon} />}
          <MapAutoCenter position={position} autoCenter={autoCenter} />
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

      {pocketMode && (
        <PocketLock 
          distance={distance} 
          zonesCount={stats.zonesCount} 
          onUnlock={() => setPocketMode(false)} 
        />
      )}
    </div>
  );
}