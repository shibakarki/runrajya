import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useZones } from '../hooks/useZones';
import { useGPS } from '../hooks/useGPS';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { db } from '../lib/db';
import rupandehiBoundary from '../data/rupandehi_boundary.json';
import L from 'leaflet';

// 1. STAT BOX COMPONENT
function StatBox({ label, val, color = '#fff' }) {
  return (
    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
      <div className="text-[8px] font-bold text-slate-500 uppercase mb-1 tracking-widest">{label}</div>
      <div className="text-lg font-black" style={{ color }}>{val}</div>
    </div>
  );
}

// 2. MAP CONTROLLER
function MapController({ position, autoCenter, setAutoCenter }) {
  const map = useMap();
  useMapEvents({ dragstart: () => setAutoCenter(false) });
  useEffect(() => {
    if (position && autoCenter) map.setView([position.lat, position.lng], map.getZoom(), { animate: true });
  }, [position, autoCenter, map]);
  return null;
}

// 3. MAIN MAP PAGE
export default function Map() {
  const { profile, user } = useAuth();
  const userId = profile?.id || user?.id;

  // SYSTEM HOOKS
  const { zones, updateZone } = useZones();
  const { isOnline, pendingCount, queueTrace, queueCapture } = useOfflineSync();
  const [sessionActive, setSessionActive] = useState(false);
  const { position, distance, heading, error, requestCompass } = useGPS(sessionActive);

  // TACTICAL STATE
  const [sessionId, setSessionId] = useState(null);
  const [points, setPoints] = useState(0);
  const [capturedCount, setCapturedCount] = useState(0);
  const [autoCenter, setAutoCenter] = useState(true);
  const [pocketMode, setPocketMode] = useState(false);
  const [lockHold, setLockHold] = useState(0);
  const [slider, setSlider] = useState(0);
  const [showPreSessionModal, setShowPreSessionModal] = useState(false);

  const lockTimer = useRef(null);

  // 1. Hot Recovery
  useEffect(() => {
    db.active_session.get('active').then(res => {
      if (res?.value) {
        setSessionActive(true);
        db.active_session.get('sessionId').then(s => setSessionId(s?.value));
        db.active_session.get('points').then(p => setPoints(p?.value || 0));
        db.active_session.get('grids').then(g => setCapturedCount(g?.value || 0));
      }
    });
  }, []);

  // 2. Capture Engine
  useEffect(() => {
    if (!position || !sessionActive || !userId) return;

    zones.forEach(zone => {
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max;

      if (inside && zone.owner_id !== userId) {
        const contested = zone.owner_id !== null;
        const newPoints = points + (contested ? 25 : 10);
        const newGrids = capturedCount + 1;

        setPoints(newPoints);
        setCapturedCount(newGrids);
        updateZone({ ...zone, owner_id: userId, revealed: true });

        db.active_session.put({ key: 'points', value: newPoints });
        db.active_session.put({ key: 'grids', value: newGrids });
        
        queueCapture({ 
          zone_id: zone.id, user_id: userId, 
          captured_at: new Date().toISOString(), contested 
        });
      }
    });

    queueTrace({ 
      session_id: sessionId, latitude: position.lat, 
      longitude: position.lng, recorded_at: new Date().toISOString() 
    });
  }, [position, sessionActive, userId]);

  // 3. Command Functions
  const startConquest = async () => {
    setShowPreSessionModal(false);
    if (requestCompass) await requestCompass();
    
    const sid = `RR-${Date.now()}`;
    setSessionId(sid);
    setSessionActive(true);
    
    db.active_session.bulkPut([
      { key: 'active', value: true },
      { key: 'sessionId', value: sid },
      { key: 'distance', value: 0 },
      { key: 'points', value: 0 },
      { key: 'grids', value: 0 }
    ]);
  };

  const endConquest = () => {
    db.active_session.clear();
    setSessionActive(false);
    setPoints(0);
    setCapturedCount(0);
    setPocketMode(false);
  };

  // 4. Custom Icon
  const compassIcon = useMemo(() => {
    if (!position) return null;
    const color = profile?.color || '#3b82f6';
    return L.divIcon({
      className: 'tactical-marker',
      html: `
        <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
          ${sessionActive ? '<div class="radar-pulse"></div>' : ''}
          <div style="transform:rotate(${heading}deg);position:absolute;width:100px;height:100px;background:radial-gradient(circle at 50% 50%, ${color}44 0%, transparent 70%);clip-path:polygon(50% 50%, 25% 0%, 75% 0%);"></div>
          <div style="width:14px;height:14px;background:white;border-radius:50%;z-index:10;box-shadow:0 2px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
             <div style="width:10px;height:10px;background:${color};border-radius:50%;"></div>
          </div>
        </div>
        <style>
          @keyframes rPulse { 0% { transform:scale(0.5); opacity:1; } 100% { transform:scale(2.5); opacity:0; } }
          .radar-pulse { position:absolute; width:40px; height:40px; border-radius:50%; border:2px solid ${color}; animation: rPulse 2s infinite; }
        </style>
      `,
      iconSize:[40,40], iconAnchor:[20,20]
    });
  }, [position, heading, sessionActive, profile]);

  return (
    <div className="flex flex-col h-full w-full bg-[#080810] fixed inset-0 overflow-hidden">
      
      {/* MAP CANVAS (65%) */}
      <div className="h-[65%] w-full relative border-b border-[#1e2042]">
        <MapContainer center={[27.55, 83.42]} zoom={13} style={{ height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={rupandehiBoundary} style={{ color: '#fff', weight: 1.5, opacity: 0.3, fillOpacity: 0 }} />
          {zones.filter(z => z.revealed).map(zone => (
            <Rectangle 
              key={zone.id} 
              bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]} 
              pathOptions={{
                fillColor: zone.owner_id ? (zone.owner_id === userId ? profile?.color : '#ff4757') : '#fff',
                fillOpacity: zone.owner_id ? 0.4 : 0.05,
                weight: 0.5,
                color: '#ffffff33'
              }}
            />
          ))}
          {position && <Marker position={[position.lat, position.lng]} icon={compassIcon} />}
          <MapController position={position} autoCenter={autoCenter} setAutoCenter={setAutoCenter} />
          <ZoomControl position="bottomleft" />
        </MapContainer>
        
        {error && (
          <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-600/90 p-3 rounded-xl text-[10px] text-white font-black uppercase tracking-widest text-center shadow-2xl">
            {error}
          </div>
        )}
      </div>

      {/* ATHLETIC CONSOLE (35%) */}
      <div className="h-[35%] w-full bg-[#0f1020] p-6 flex flex-col justify-between z-20">
        {sessionActive ? (
          <>
            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>{isOnline ? '🟢 Live' : '🔴 Offline'}</span>
              <span>Queue: {pendingCount}</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Distance" val={`${Math.round(distance)}m`} />
              <StatBox label="Score" val={`+${points}`} color={profile?.color} />
              <StatBox label="Grids" val={capturedCount} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAutoCenter(!autoCenter)} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase">
                {autoCenter ? '🎯 Locked' : '🔓 Free'}
              </button>
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
                className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white relative overflow-hidden uppercase"
              >
                <div className="absolute inset-y-0 left-0 bg-blue-500/20" style={{ width: `${lockHold}%` }} />
                🔒 Hold to Lock
              </button>
            </div>

            <button onClick={endConquest} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl">
              End Session
            </button>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <h2 className="text-white font-black text-2xl tracking-tighter uppercase italic mb-6">RunRajya Conquest</h2>
            <button 
              onClick={() => setShowPreSessionModal(true)} 
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-2xl"
            >
              Begin Run Session
            </button>
          </div>
        )}
      </div>

      {/* MODAL: PRE-SESSION */}
      {showPreSessionModal && (
        <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-[#0f1020] border border-white/10 w-full max-w-sm rounded-[40px] p-10 text-center shadow-2xl">
            <div className="text-6xl mb-6">🛰️</div>
            <h2 className="text-white text-2xl font-black mb-3">Tactical Sync</h2>
            <p className="text-slate-400 text-xs font-medium leading-relaxed uppercase tracking-wide mb-10">Step outdoors. Ensure High-Accuracy GPS is enabled.</p>
            <div className="flex flex-col gap-3">
              <button onClick={startConquest} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest">Start Now</button>
              <button onClick={() => setShowPreSessionModal(false)} className="w-full py-5 text-slate-500 font-black text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* POCKET LOCK OVERLAY */}
      {pocketMode && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-10 select-none touch-none">
          <div className="text-8xl mb-12 animate-pulse">🔒</div>
          <div className="relative h-24 w-full max-w-xs bg-white/5 rounded-[40px] border border-white/10 p-2 flex items-center overflow-hidden">
            <input 
              type="range" min="0" max="100" value={slider} 
              onChange={(e) => { setSlider(e.target.value); if(e.target.value >= 90) { setPocketMode(false); setSlider(0); }}} 
              onTouchEnd={() => setSlider(0)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            <div className="h-20 w-20 bg-blue-600 rounded-[30px] flex items-center justify-center text-3xl shadow-2xl transition-all" style={{ marginLeft: `${slider * 0.75}%` }}>→</div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-500/30 uppercase tracking-[0.4em] pointer-events-none">
              Slide to Unlock
            </div>
          </div>
        </div>
      )}
    </div>
  );
}