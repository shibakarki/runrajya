import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { useZones } from '../hooks/useZones';
import { useGPS } from '../hooks/useGPS';
import { useOfflineSync } from '../hooks/useOfflineSync';
import rupandehiBoundary from '../data/rupandehi_boundary.json';
import L from 'leaflet';

const REVEAL_RADIUS = 150;

export default function Map() {
  const { profile, user } = useAuth();
  const userId = profile?.id || user?.id;

  // SYSTEM HOOKS
  const { zones, updateZoneLocally } = useZones();
  const { isOnline, pendingCount, queueTrace, queueCapture } = useOfflineSync();
  
  // SESSION STATE (With Hot Recovery)
  const [sessionActive, setSessionActive] = useState(() => JSON.parse(localStorage.getItem('rr_active'))?.active || false);
  const [sessionId, setSessionId] = useState(() => JSON.parse(localStorage.getItem('rr_active'))?.id || null);
  const [stats, setStats] = useState({ points: 0, grids: 0 });

  // UI STATE
  const [pocketMode, setPocketMode] = useState(false);
  const [lockHold, setLockHold] = useState(0);
  const [slider, setSlider] = useState(0);
  const [autoCenter, setAutoCenter] = useState(true);
  const { position, distance, heading, error, requestCompassPermission } = useGPS(sessionActive);

  const lockTimer = useRef(null);

  // Persistence Loop
  useEffect(() => {
    if (sessionActive) {
      localStorage.setItem('rr_active', JSON.stringify({ active: true, id: sessionId }));
    }
  }, [sessionActive, sessionId]);

  // CAPTURE LOGIC
  useEffect(() => {
    if (!position || !sessionActive || !userId) return;

    zones.forEach(zone => {
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max;

      if (inside && zone.owner_id !== userId) {
        const isContested = zone.owner_id !== null;
        const updated = { ...zone, owner_id: userId, revealed: true };
        
        updateZoneLocally(updated); // Paint UI
        setStats(s => ({ points: s.points + (isContested ? 25 : 10), grids: s.grids + 1 }));
        
        queueCapture({ 
          zone_id: zone.id, 
          user_id: userId, 
          captured_at: new Date().toISOString(), 
          contested: isContested 
        });
      }
    });

    queueTrace({ session_id: sessionId, latitude: position.lat, longitude: position.lng, recorded_at: new Date().toISOString() });
  }, [position]);

  // HELPERS
  const handleStart = async () => {
    await requestCompassPermission();
    let sid = `off-${Date.now()}`;
    if (isOnline) {
      const { data } = await supabase.from('sessions').insert({ user_id: userId, started_at: new Date().toISOString() }).select().single();
      if (data) sid = data.id;
    }
    setSessionId(sid); setSessionActive(true);
  };

  const handleEnd = () => {
    localStorage.removeItem('rr_active');
    setSessionActive(false); setSessionId(null); setStats({ points: 0, grids: 0 }); setPocketMode(false);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#080810] fixed inset-0 overflow-hidden">
      
      {/* MAP (65%) */}
      <div className="w-full h-[65%] relative border-b border-[#1e2042]">
        <MapContainer center={[27.55, 83.42]} zoom={13} style={{ height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={rupandehiBoundary} style={{ color: '#fff', weight: 1, opacity: 0.2, fillOpacity: 0 }} />
          <ZoneLayer zones={zones} profile={profile} />
          {position && <PlayerMarker position={position} heading={heading} color={profile?.color} active={sessionActive} />}
          <MapController position={position} autoCenter={autoCenter} setAutoCenter={setAutoCenter} />
          <ZoomControl position="bottomleft" />
        </MapContainer>
        {error && <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-600 p-2 rounded text-[10px] text-white font-bold text-center uppercase tracking-widest">{error}</div>}
      </div>

      {/* COCKPIT (35%) */}
      <div className="w-full h-[35%] bg-[#0f1020] p-6 flex flex-col justify-between">
        {sessionActive ? (
          <>
            <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>{isOnline ? '🟢 Live' : '🔴 Offline'}</span>
              <span>Queue: {pendingCount}</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <StatBox label="Dist" val={`${Math.round(distance)}m`} />
              <StatBox label="Score" val={`+${stats.points}`} color={profile?.color} />
              <StatBox label="Grids" val={stats.grids} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setAutoCenter(!autoCenter)} className="py-4 bg-white/5 rounded-2xl text-[10px] text-white font-black uppercase border border-white/10">{autoCenter ? '🎯 Locked' : '🔓 Free'}</button>
              <button 
                onTouchStart={() => {
                  let s = Date.now();
                  lockTimer.current = setInterval(() => {
                    let p = Math.min(((Date.now()-s)/1500)*100, 100);
                    setLockHold(p);
                    if(p >= 100) { clearInterval(lockTimer.current); setPocketMode(true); setLockHold(0); }
                  }, 50);
                }}
                onTouchEnd={() => { clearInterval(lockTimer.current); setLockHold(0); }}
                className="py-4 bg-white/5 rounded-2xl text-[10px] text-white font-black uppercase border border-white/10 relative overflow-hidden"
              >
                <div className="absolute inset-y-0 left-0 bg-blue-500/20" style={{ width: `${lockHold}%` }} />
                🔒 Lock
              </button>
            </div>
            <button onClick={handleEnd} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest">End Session</button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <h2 className="text-white font-black text-xl italic uppercase tracking-tighter">RunRajya</h2>
            <button onClick={handleStart} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl">Start Conquest</button>
          </div>
        )}
      </div>

      {/* POCKET LOCK OVERLAY */}
      {pocketMode && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 select-none">
          <div className="text-7xl mb-10 animate-pulse">🔒</div>
          <div className="relative h-24 w-full max-w-xs bg-white/5 rounded-[40px] border border-white/10 p-2 flex items-center">
            <input type="range" min="0" max="100" value={slider} onChange={(e) => { setSlider(e.target.value); if(e.target.value >= 90) { setPocketMode(false); setSlider(0); }}} onTouchEnd={() => setSlider(0)} className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-pointer" />
            <div className="h-20 w-20 bg-blue-600 rounded-[32px] flex items-center justify-center text-3xl shadow-2xl transition-all" style={{ marginLeft: `${slider * 0.7}%` }}>→</div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-500/30 uppercase tracking-[0.5em] pointer-events-none">Slide Unlock</div>
          </div>
        </div>
      )}
    </div>
  );
}

// SUB-COMPONENTS
function StatBox({ label, val, color = '#fff' }) {
  return (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
      <div className="text-[8px] font-bold text-slate-500 uppercase mb-1 tracking-tighter">{label}</div>
      <div className="text-lg font-black" style={{ color }}>{val}</div>
    </div>
  );
}

function PlayerMarker({ position, heading, color = '#3b82f6', active }) {
  const icon = L.divIcon({
    className: 'player-icon',
    html: `
      <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
        ${active ? '<div class="pulse"></div>' : ''}
        <div style="transform:rotate(${heading || 0}deg);width:80px;height:80px;position:absolute;background:radial-gradient(circle at 50% 50%, ${color}33 0%, transparent 70%);clip-path:polygon(50% 50%, 25% 0%, 75% 0%);"></div>
        <div style="width:14px;height:14px;background:white;border-radius:50%;display:flex;align-items:center;justify-content:center;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,0.5)">
          <div style="width:10px;height:10px;background:${color};border-radius:50%"></div>
        </div>
      </div>
      <style>
        .pulse { position:absolute; width:40px; height:40px; border-radius:50%; border:2px solid ${color}; animation: p 2s infinite; opacity:0; }
        @keyframes p { 0% { transform:scale(0.5); opacity:1 } 100% { transform:scale(2.5); opacity:0 } }
      </style>
    `,
    iconSize: [40, 40], iconAnchor: [20, 20]
  });
  return <Marker position={[position.lat, position.lng]} icon={icon} />;
}

function ZoneLayer({ zones, profile }) {
  return zones.filter(z => z.revealed).map(zone => (
    <Rectangle
      key={zone.id}
      bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]}
      pathOptions={{
        color: zone.owner_id ? (zone.owner_id === profile?.id ? profile.color : '#ff4757') : '#fff',
        weight: 0.5,
        fillOpacity: zone.owner_id ? 0.35 : 0.05,
        fillColor: zone.owner_id ? (zone.owner_id === profile?.id ? profile.color : '#ff4757') : '#fff',
      }}
    />
  ));
}

function MapController({ position, autoCenter, setAutoCenter }) {
  const map = useMap();
  useMapEvents({ dragstart: () => setAutoCenter(false) });
  useEffect(() => {
    if (position && autoCenter) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [position, autoCenter]);
  return null;
}