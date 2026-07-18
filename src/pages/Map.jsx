import { MapContainer, TileLayer, Marker, ZoomControl, Rectangle, useMap } from 'react-leaflet';
import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useZones } from '../hooks/useZones';
import { useGPS } from '../hooks/useGPS';
import { useOfflineSync } from '../hooks/useOfflineSync';
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
  }, [position, sessionActive]);

  const compassIcon = useMemo(() => {
    if (!position) return null;
    const color = profile?.color || '#3b82f6';
    return L.divIcon({
      className: 't-icon',
      html: `<div style="transform:rotate(${heading}deg); position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
               <div style="width:14px; height:14px; background:white; border-radius:50%; border:3px solid ${color}; box-shadow:0 0 15px ${color};"></div>
               <div style="position:absolute; top:-8px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:10px solid ${color};"></div>
             </div>`
    });
  }, [position, heading, profile]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-[#080810] overflow-hidden">
      
      {/* MAP AREA: 65% on Mobile, Full width minus sidebar on Desktop */}
      <div className="w-full h-[65%] md:h-full md:flex-1 relative border-b md:border-b-0 md:border-r border-[#1e2042]">
        <MapContainer center={[27.55, 83.42]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
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

        {error && (
          <div className="absolute top-24 left-4 right-4 z-[1000] bg-red-900/90 border border-red-500/50 p-3 rounded-xl text-[10px] text-white font-black text-center uppercase tracking-[0.2em] shadow-2xl backdrop-blur-md">
            {error}
          </div>
        )}
      </div>

      {/* CONSOLE AREA: 35% on Mobile, 400px Sidebar on Desktop */}
      <div className="w-full h-[35%] md:h-full md:w-[400px] bg-[#0f1020] p-4 md:p-8 z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
        <AthleticConsole 
          sessionActive={sessionActive}
          metrics={{ distance, ...stats, color: profile?.color }}
          syncData={{ isOnline, pendingCount }}
          autoCenter={autoCenter}
          setAutoCenter={setAutoCenter}
          onAction={() => {
            if(!sessionActive) requestCompass();
            setSessionActive(!sessionActive);
          }}
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