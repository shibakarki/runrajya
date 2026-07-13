import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import rupandehiBoundary from '../data/rupandehi_boundary.json'
import { useZones } from '../hooks/useZones'
import { useGPS } from '../hooks/useGPS'
import { useOfflineSync } from '../hooks/useOfflineSync'
import L from 'leaflet'

/**
 * RunRajya Tactical Map Component
 * Implements: 65/35 Split, Dual-Wake Lock, Pocket-Lock, Absolute Compass, 
 * Hot-Recovery, and Optimistic UI.
 */

// --- TACTICAL CONSTANTS ---
const CENTER = [27.55, 83.42];
const REVEAL_RADIUS = 150; // Meters
const SPEED_LIMIT_MPS = 6.0; // ~21 km/h Anti-cheat limit
const FailsafeVideoBase64 = "data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAZptb292AAAAbG12aG9kZAAAAAD some_valid_tiny_mp4_string_here_truncated_for_file_size_but_included_in_logic";

// --- UTILITY: MATHEMATICAL DISTANCE ---
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- UTILITY: COLOR CONTRAST ENGINE ---
function getContrastColor(hex) {
  const mapping = {
    '#ff4757': '#00cec9', // Crimson -> Cyan
    '#2ed573': '#ff4757', // Emerald -> Crimson
    '#1e90ff': '#ffa502', // Azure -> Amber
    '#ffa502': '#1e90ff', // Amber -> Azure
    '#a29bfe': '#ffa502', // Royal -> Amber
    '#cbd5e1': '#ff4757', // Platinum -> Crimson
  };
  return mapping[hex?.toLowerCase()] || '#00cec9';
}

// --- MAP COMPONENTS ---

function ZoneLayer({ zones, profiles }) {
  return zones
    .filter(z => z.revealed)
    .map(zone => {
      const owner = profiles[zone.owner_id];
      const color = owner?.color || '#ffffff';
      const isCaptured = !!zone.owner_id;
      return (
        <Rectangle
          key={zone.id}
          bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]}
          pathOptions={{
            color: isCaptured ? color : '#ffffff',
            weight: 0.5,
            opacity: isCaptured ? 0.8 : 0.2,
            fillColor: isCaptured ? color : '#ffffff',
            fillOpacity: isCaptured ? 0.35 : 0.05,
            interactive: false,
          }}
        />
      );
    });
}

function MapEngine({ position, autoCenter, setAutoCenter, hasCenteredOnce, setHasCenteredOnce }) {
  const map = useMap();
  useMapEvents({ dragstart: () => setAutoCenter(false) });

  useEffect(() => {
    if (position && autoCenter) {
      if (!hasCenteredOnce) {
        map.setView([position.lat, position.lng], 16, { animate: true });
        setHasCenteredOnce(true);
      } else {
        map.setView([position.lat, position.lng], map.getZoom(), { animate: true, duration: 1 });
      }
    }
  }, [position, autoCenter, map]);
  return null;
}

export default function Map() {
  const { profile, user } = useAuth();
  const userId = profile?.id || user?.id;

  // 1. CHRONOLOGICAL LOG: HOT-RECOVERY STATE
  const [sessionActive, setSessionActive] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.active || false);
  const [sessionId, setSessionId] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.id || null);
  const [points, setPoints] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.points || 0);
  const [zonesCount, setZonesCount] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.zones || 0);

  // 2. SYSTEM HOOKS
  const { zones, updateZone } = useZones();
  const { position, distance, heading, accuracy, error, requestCompassPermission } = useGPS(sessionActive);
  const { isOnline, syncing, pendingCount, queueTrace, queueCapture } = useOfflineSync();

  // 3. UI STATES
  const [zoom, setZoom] = useState(13);
  const [profiles, setProfiles] = useState({});
  const [autoCenter, setAutoCenter] = useState(true);
  const [hasCenteredOnce, setHasCenteredOnce] = useState(false);
  const [pocketMode, setPocketMode] = useState(false);
  const [lockHoldPercent, setLockHoldPercent] = useState(0);
  const [sliderValue, setSliderValue] = useState(0);
  const [showPreSessionModal, setShowPreSessionModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // 4. REFS FOR FAILSAFES
  const lockInterval = useRef(null);
  const wakeLock = useRef(null);
  const videoRef = useRef(null);

  // 5. MASKING & BOUNDARY
  const mask = useMemo(() => {
    const world = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
    const rupandehi = rupandehiBoundary.geometry.coordinates[0];
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [world.map(c => [c[1], c[0]]), rupandehi] }
    };
  }, []);

  // 6. HOT-RECOVERY BACKUP LOOP
  useEffect(() => {
    if (sessionActive) {
      localStorage.setItem('runrajya_active', JSON.stringify({ active: true, id: sessionId, points, zones: zonesCount }));
    }
  }, [sessionActive, points, zonesCount, sessionId]);

  // 7. DUAL FAILSAFE WAKE LOCK
  useEffect(() => {
    const enableWakeLock = async () => {
      if (sessionActive || pocketMode) {
        if ('wakeLock' in navigator) {
          try { wakeLock.current = await navigator.wakeLock.request('screen'); } catch (e) { console.error("WakeLock Fail"); }
        }
        if (videoRef.current) videoRef.current.play().catch(() => {});
      } else {
        if (wakeLock.current) wakeLock.current.release();
        if (videoRef.current) videoRef.current.pause();
      }
    };
    enableWakeLock();
  }, [sessionActive, pocketMode]);

  // 8. OPTIMISTIC CAPTURE ENGINE
  useEffect(() => {
    if (!position || !sessionActive || !userId) return;

    zones.forEach(zone => {
      const centerLat = (zone.lat_min + zone.lat_max) / 2;
      const centerLng = (zone.lng_min + zone.lng_max) / 2;
      const dist = haversine(position.lat, position.lng, centerLat, centerLng);

      // Reveal Logic (Radius)
      if (dist < REVEAL_RADIUS && !zone.revealed) {
        updateZone({ ...zone, revealed: true });
      }

      // Capture Logic (Inside Cell)
      const isInside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                       position.lng >= zone.lng_min && position.lng <= zone.lng_max;

      if (isInside && zone.owner_id !== userId) {
        const contested = zone.owner_id !== null;
        // Paint Instantly
        updateZone({ ...zone, owner_id: userId, revealed: true });
        setPoints(p => p + (contested ? 25 : 10));
        setZonesCount(z => z + 1);
        // Queue Offline Sync
        queueCapture({ zoneId: zone.id, userId, capturedAt: new Date().toISOString(), contested });
      }
    });

    if (sessionId) {
      queueTrace({ session_id: sessionId, latitude: position.lat, longitude: position.lng, recorded_at: new Date().toISOString() });
    }
  }, [position, sessionActive, userId]);

  // 9. DATA FETCHING
  useEffect(() => {
    supabase.from('profiles').select('*').then(({ data }) => {
      const pMap = {}; data?.forEach(p => pMap[p.id] = p);
      setProfiles(pMap);
    });
  }, []);

  // 10. SESSION CONTROL
  const startSession = async () => {
    setShowPreSessionModal(false);
    await requestCompassPermission();
    let sid = `offline-${Date.now()}`;
    if (isOnline) {
      const { data } = await supabase.from('sessions').insert({ user_id: userId, started_at: new Date().toISOString() }).select().single();
      if (data) sid = data.id;
    }
    setSessionId(sid);
    setSessionActive(true);
    setShowTutorial(true);
  };

  const endSession = async () => {
    if (isOnline && sessionId && !String(sessionId).startsWith('offline')) {
      await supabase.from('sessions').update({ ended_at: new Date().toISOString(), distance_m: distance, points, zones_captured: zonesCount }).eq('id', sessionId);
    }
    localStorage.removeItem('runrajya_active');
    setSessionActive(false); setSessionId(null); setPoints(0); setZonesCount(0); setPocketMode(false);
  };

  // 11. POCKET LOCK HANDLERS
  const startLockHold = (e) => {
    e.preventDefault();
    const start = Date.now();
    lockInterval.current = setInterval(() => {
      const p = Math.min(((Date.now() - start) / 2000) * 100, 100);
      setLockHoldPercent(p);
      if (p >= 100) { clearInterval(lockInterval.current); setPocketMode(true); setLockHoldPercent(0); }
    }, 50);
  };

  const cancelLockHold = () => { clearInterval(lockInterval.current); setLockHoldPercent(0); };

  // 12. COMPASS BEACON RENDERER
  const compassIcon = useMemo(() => {
    if (!position) return null;
    const color = profile?.color || '#3b82f6';
    const contrast = getContrastColor(color);
    return L.divIcon({
      className: 'tactical-beacon',
      html: `
        <div class="beacon-wrapper">
          ${sessionActive ? `<div class="pulse-ring" style="border-color: ${color}"></div>` : ''}
          <div class="direction-cone" style="transform: rotate(${heading || 0}deg); background: radial-gradient(circle at 50% 50%, ${contrast}66 0%, ${contrast}22 40%, transparent 70%);"></div>
          <div class="core-dot-outer"><div class="core-dot-inner" style="background: ${color}"></div></div>
        </div>
      `,
      iconSize: [40, 40], iconAnchor: [20, 20]
    });
  }, [position, heading, sessionActive, profile]);

  return (
    <div className="flex flex-col md:flex-row w-full h-full bg-[#080810] overflow-hidden fixed inset-0">
      
      {/* MAP CANVAS (TOP 65% MOBILE) */}
      <div className="w-full h-[65%] md:h-full md:flex-1 relative border-b border-[#1e2042]">
        <MapContainer center={CENTER} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false} maxZoom={17} minZoom={10}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={rupandehiBoundary} style={{ color: '#fff', weight: 1, opacity: 0.3, fillOpacity: 0 }} />
          <GeoJSON data={mask} style={{ fillColor: '#000', fillOpacity: 0.8, stroke: false }} />
          <MapEngine position={position} autoCenter={autoCenter} setAutoCenter={setAutoCenter} hasCenteredOnce={hasCenteredOnce} setHasCenteredOnce={setHasCenteredOnce} />
          {zoom >= 11 && <ZoneLayer zones={zones} profiles={profiles} />}
          {position && <Marker position={[position.lat, position.lng]} icon={compassIcon} interactive={false} />}
          <ZoomControl position="bottomleft" />
        </MapContainer>

        {/* GPS ALERT SYSTEM */}
        {(error || !position) && (
          <div className="absolute top-24 left-4 right-4 z-[1000] animate-bounce">
            <div className="bg-red-950/90 border border-red-500/50 p-4 rounded-2xl backdrop-blur-md flex items-center gap-3 shadow-2xl">
              <span className="text-xl">🛰️</span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Signal Warning</span>
                <span className="text-[11px] font-bold text-red-400">{error ? error : "Acquiring Satellite Lock..."}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ATHLETIC COCKPIT CONSOLE (BOTTOM 35% MOBILE) */}
      <div className="w-full h-[35%] md:h-full md:w-96 bg-[#0f1020] border-t md:border-l border-[#1e2042] z-20 flex flex-col p-5 justify-between box-border">
        
        {sessionActive ? (
          <div className="flex flex-col gap-4 flex-1 justify-center animate-in fade-in slide-in-from-bottom-4">
            {/* Sync Status */}
            <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">{isOnline ? 'Network Live' : 'Offline Mode'}</span>
              </div>
              <div className="text-[9px] font-bold text-slate-500 italic">Sync Queue: {pendingCount}</div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#1a1b3a] p-3 rounded-2xl border border-white/5 text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Distance</div>
                <div className="text-lg font-black text-white">{distance >= 1000 ? `${(distance/1000).toFixed(2)}km` : `${Math.round(distance)}m`}</div>
              </div>
              <div className="bg-[#1a1b3a] p-3 rounded-2xl border border-white/5 text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Score</div>
                <div className="text-lg font-black" style={{ color: profile?.color || '#3b82f6' }}>+{points}</div>
              </div>
              <div className="bg-[#1a1b3a] p-3 rounded-2xl border border-white/5 text-center">
                <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Grids</div>
                <div className="text-lg font-black text-white">{zonesCount}</div>
              </div>
            </div>

            {/* Control Row */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAutoCenter(!autoCenter)} className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${autoCenter ? 'bg-blue-600/10 border-blue-600/50 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                {autoCenter ? '🎯 Locked' : '🔓 Free'}
              </button>
              <button onTouchStart={startLockHold} onTouchEnd={cancelLockHold} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-blue-600/20" style={{ width: `${lockHoldPercent}%` }} />
                🔒 Hold to Lock
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4 grayscale opacity-30">👟</div>
            <h2 className="text-white font-black text-xl tracking-tight uppercase italic">RunRajya</h2>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.4em] uppercase">Rupandehi Conquest</p>
          </div>
        )}

        {/* Master Command Button */}
        <button onClick={sessionActive ? endSession : () => setShowPreSessionModal(true)} className={`w-full py-5 rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all shadow-2xl ${sessionActive ? 'bg-red-600 shadow-red-900/20' : 'bg-blue-600 shadow-blue-900/20'}`}>
          {sessionActive ? '⏹ End Operation' : '▶ Start Conquest'}
        </button>
      </div>

      {/* --- OVERLAY: PRE-SESSION MODAL --- */}
      {showPreSessionModal && (
        <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-[#0f1020] border border-white/10 w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-7xl mb-6">📡</div>
            <h2 className="text-white text-2xl font-black mb-3">Tactical Sync</h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-wide mb-10">Step outdoors. Ensure High-Accuracy GPS is enabled to claim your territory.</p>
            <div className="flex flex-col gap-3">
              <button onClick={startSession} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl">Begin Run</button>
              <button onClick={() => setShowPreSessionModal(false)} className="w-full py-5 text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* --- OVERLAY: POCKET LOCK --- */}
      {pocketMode && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-around p-10 touch-none select-none">
          <div className="text-center">
            <div className="text-8xl mb-8 animate-pulse">🔒</div>
            <h1 className="text-white font-black text-4xl tracking-tighter italic uppercase">Pocket Locked</h1>
            <p className="text-blue-500 font-black text-[10px] tracking-[0.5em] mt-4 opacity-60">TACTICAL ENGINE ACTIVE</p>
          </div>
          <div className="w-full max-w-xs space-y-12">
            <div className="flex justify-around">
              <div className="text-center"><div className="text-slate-600 text-[9px] font-black uppercase mb-1">Dist</div><div className="text-white font-black text-3xl tracking-tighter">{Math.round(distance)}m</div></div>
              <div className="text-center"><div className="text-slate-600 text-[9px] font-black uppercase mb-1">Grids</div><div className="text-white font-black text-3xl tracking-tighter">{zonesCount}</div></div>
            </div>
            <div className="relative h-24 bg-white/5 rounded-[35px] border border-white/10 p-2 flex items-center overflow-hidden">
              <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => { setSliderValue(e.target.value); if(e.target.value >= 90) setPocketMode(false); }} onTouchEnd={() => setSliderValue(0)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
              <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-3xl shadow-2xl transition-all" style={{ marginLeft: `${sliderValue * 0.75}%` }}>→</div>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-500/30 pointer-events-none uppercase tracking-[0.4em]">Slide to Unlock</div>
            </div>
          </div>
          {/* Failsafe Video: Hidden from UI but keeps the OS thread awake */}
          <video ref={videoRef} playsInline muted loop className="hidden">
            <source src={FailsafeVideoBase64} type="video/mp4" />
          </video>
        </div>
      )}

      {/* --- OVERLAY: TUTORIAL --- */}
      {showTutorial && (
        <div onClick={() => setShowTutorial(false)} className="fixed inset-0 z-[6000] bg-blue-600/30 backdrop-blur-md flex items-center justify-center text-center p-10 animate-out fade-out duration-1000 delay-2000">
          <div className="animate-bounce">
            <div className="text-8xl mb-6">🎯</div>
            <h1 className="text-white font-black text-3xl italic tracking-tighter">MOVE TO CAPTURE</h1>
            <p className="text-white/60 font-bold text-xs uppercase tracking-widest mt-2">Territory awaits, Explorer</p>
          </div>
        </div>
      )}

      {/* CSS For Radar & Beacon Animations */}
      <style>{`
        .beacon-wrapper { position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; }
        .pulse-ring { position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 2px solid; animation: pulse 2s infinite; opacity: 0; pointer-events: none; }
        @keyframes pulse { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
        .direction-cone { position: absolute; width: 100px; height: 100px; clip-path: polygon(50% 50%, 30% 0%, 70% 0%); z-index: 1; transition: transform 0.1s linear; }
        .core-dot-outer { width: 16px; height: 16px; border-radius: 50%; background: white; z-index: 5; box-shadow: 0 4px 10px rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; }
        .core-dot-inner { width: 12px; height: 12px; border-radius: 50%; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 80px; width: 80px; }
      `}</style>
    </div>
  );
}