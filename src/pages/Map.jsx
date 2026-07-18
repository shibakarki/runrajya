import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, ZoomControl, useMap } from 'react-leaflet';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useZones } from '../hooks/useZones';
import { useGPS } from '../hooks/useGPS';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { db } from '../lib/db';
import rupandehiBoundary from '../data/rupandehi_boundary.json';
import L from 'leaflet';

// --- HELPERS ---
function buildMask(geoJsonFeature) {
  const coords = geoJsonFeature.geometry.type === 'Polygon' 
    ? geoJsonFeature.geometry.coordinates 
    : geoJsonFeature.geometry.coordinates[0];

  const worldOuter = [[180, -180], [180, 180], [-180, 180], [-180, -180], [180, -180]];
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [worldOuter.map(c => [c[1], c[0]]), ...coords]
    }
  };
}

function MapAutoCenter({ position, autoCenter }) {
  const map = useMap();
  useEffect(() => {
    if (position && autoCenter) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [position, autoCenter, map]);
  return null;
}

// --- MAIN PAGE ---
export default function MapPage() {
  const { profile } = useAuth();
  const { zones, updateZone } = useZones();
  const { isOnline, pendingCount, queueTrace, queueCapture } = useOfflineSync();
  
  const [sessionActive, setSessionActive] = useState(false);
  const { position, distance, heading, error, requestCompass } = useGPS(sessionActive);
  
  const [stats, setStats] = useState({ points: 0, zonesCount: 0 });
  const [autoCenter, setAutoCenter] = useState(true);
  const [pocketMode, setPocketMode] = useState(false);
  const [slider, setSlider] = useState(0);

  const maskData = useMemo(() => buildMask(rupandehiBoundary), []);

  // Capture Engine
  useEffect(() => {
    if (!position || !sessionActive || !profile?.id) return;
    zones.forEach(zone => {
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max;
      if (inside && zone.owner_id !== profile.id) {
        const contested = zone.owner_id !== null;
        updateZone({ ...zone, owner_id: profile.id, revealed: true });
        setStats(s => ({ points: s.points + (contested ? 25 : 10), zonesCount: s.zonesCount + 1 }));
        queueCapture({ zone_id: zone.id, user_id: profile.id, captured_at: new Date().toISOString(), contested });
      }
    });
    queueTrace({ latitude: position.lat, longitude: position.lng, recorded_at: new Date().toISOString() });
  }, [position, sessionActive]);

  const compassIcon = useMemo(() => {
    if (!position) return null;
    const color = profile?.color || '#3b82f6';
    return L.divIcon({
      className: 't-icon',
      html: `<div style="transform:rotate(${heading}deg);width:16px;height:16px;background:white;border-radius:50%;border:3px solid ${color};box-shadow:0 0 15px ${color};"></div>`
    });
  }, [position, heading, profile]);

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[#080810] pt-20 overflow-hidden">
      
      {/* 65% MAP */}
      <div className="w-full h-[65%] md:h-full md:flex-1 relative border-b md:border-b-0 md:border-r border-white/5">
        <MapContainer center={[27.55, 83.42]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          <GeoJSON data={maskData} style={{ fillColor: '#000', fillOpacity: 0.75, stroke: false }} />
          <GeoJSON data={rupandehiBoundary} style={{ color: '#06b6d4', weight: 2, fillOpacity: 0, dashArray: '5, 10' }} />
          {zones.filter(z => z.revealed).map(zone => (
            <Rectangle key={zone.id} bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]} 
              pathOptions={{ fillColor: zone.owner_id ? (zone.owner_id === profile?.id ? profile?.color : '#ff4757') : '#fff', fillOpacity: 0.3, weight: 0.5 }} />
          ))}
          {position && <Marker position={[position.lat, position.lng]} icon={compassIcon} />}
          <MapAutoCenter position={position} autoCenter={autoCenter} />
          <ZoomControl position="bottomleft" />
        </MapContainer>
        {error && <div className="absolute top-4 left-4 right-4 z-[1000] bg-red-900/90 p-3 rounded-xl text-[10px] text-white font-black text-center">{error}</div>}
      </div>

      {/* 35% COCKPIT */}
      <div className="w-full h-[35%] md:h-full md:w-[400px] bg-[#0f1020] p-6 flex flex-col justify-between z-20">
        {sessionActive ? (
          <>
            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
              <span>{isOnline ? '🟢 Live' : '🔴 Buffer'}</span>
              <span>Sync: {pendingCount}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 p-3 rounded-2xl text-center"><div className="text-[8px] text-slate-500 font-bold uppercase">Dist</div><div className="text-lg font-black">{Math.round(distance)}m</div></div>
              <div className="bg-white/5 p-3 rounded-2xl text-center"><div className="text-[8px] text-slate-500 font-bold uppercase">Pts</div><div className="text-lg font-black" style={{color: profile?.color}}>+{stats.points}</div></div>
              <div className="bg-white/5 p-3 rounded-2xl text-center"><div className="text-[8px] text-slate-500 font-bold uppercase">Grid</div><div className="text-lg font-black">{stats.zonesCount}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAutoCenter(!autoCenter)} className={`py-4 rounded-xl text-[10px] font-black border ${autoCenter ? 'border-cyan-500 text-cyan-400' : 'border-white/10 text-white'}`}>{autoCenter ? '🎯 Locked' : '🔓 Free'}</button>
              <button onClick={() => setPocketMode(true)} className="py-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-white">🔒 Lock</button>
            </div>
            <button onClick={() => setSessionActive(false)} className="w-full py-4 bg-red-600 text-white font-black rounded-xl text-xs uppercase tracking-widest">End Session</button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
             <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic">RunRajya HUD</h2>
             <button onClick={() => { requestCompass?.(); setSessionActive(true); }} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-2xl">Begin Incursion</button>
          </div>
        )}
      </div>

      {/* POCKET LOCK */}
      {pocketMode && (
        <div className="fixed inset-0 z-[6000] bg-black flex flex-col items-center justify-center p-10 select-none">
          <div className="text-8xl mb-12 animate-pulse">🔒</div>
          <div className="relative h-24 w-full max-w-xs bg-white/5 rounded-[40px] border border-white/10 p-2 flex items-center overflow-hidden">
            <input type="range" min="0" max="100" value={slider} onChange={(e) => { setSlider(e.target.value); if(e.target.value >= 90) { setPocketMode(false); setSlider(0); }}} onTouchEnd={() => setSlider(0)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className="h-20 w-20 bg-blue-600 rounded-[30px] flex items-center justify-center text-3xl shadow-2xl transition-all" style={{ marginLeft: `${slider * 0.75}%` }}>→</div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-500/30 uppercase tracking-[0.4em] pointer-events-none">Slide to Unlock</div>
          </div>
        </div>
      )}
    </div>
  );
}