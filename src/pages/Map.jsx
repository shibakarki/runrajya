import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import rupandehiBoundary from '../data/rupandehi_boundary.json'
import { useZones } from '../hooks/useZones'
import { useGPS } from '../hooks/useGPS'
import { useOfflineSync } from '../hooks/useOfflineSync'
import L from 'leaflet'

// --- TACTICAL CONSTANTS ---
const CENTER = [27.55, 83.42]
const REVEAL_RADIUS = 150 

// --- UTILITIES ---
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildMask(geoJsonFeature) {
  const coords = geoJsonFeature.geometry.coordinates[0]
  const worldRing = [[-90, -180], [-90, 180], [90, 180], [90, -180]]
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [worldRing.map(c => [c[1], c[0]]), coords] } }
}

function getContrastColor(hex) {
  const mapping = { '#ff4757': '#00cec9', '#2ed573': '#ff4757', '#1e90ff': '#ffa502', '#ffa502': '#1e90ff', '#a29bfe': '#ffa502' }
  return mapping[hex?.toLowerCase()] || '#00cec9'
}

// --- COMPONENTS ---
function ZoneLayer({ zones, profiles }) {
  return zones.filter(z => z.revealed).map(zone => {
    const owner = profiles[zone.owner_id]
    const color = owner?.color || '#ffffff'
    const isCaptured = !!zone.owner_id
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
    )
  })
}

function MapEngine({ position, autoCenter, setAutoCenter, hasCenteredOnce, setHasCenteredOnce }) {
  const map = useMap()
  useMapEvents({ dragstart: () => setAutoCenter(false) })
  useEffect(() => {
    if (position && autoCenter) {
      if (!hasCenteredOnce) {
        map.setView([position.lat, position.lng], 16, { animate: true })
        setHasCenteredOnce(true)
      } else {
        map.setView([position.lat, position.lng], map.getZoom(), { animate: true, duration: 1 })
      }
    }
  }, [position, autoCenter])
  return null
}

export default function Map() {
  const { profile, user } = useAuth()
  const userId = profile?.id || user?.id
  const { zones, updateZone } = useZones()
  const { isOnline, syncing, pendingCount, queueTrace, queueCapture } = useOfflineSync()

  // Session Stats
  const [sessionActive, setSessionActive] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.active || false)
  const [sessionId, setSessionId] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.id || null)
  const [points, setPoints] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.points || 0)
  const [zonesCount, setZonesCount] = useState(() => JSON.parse(localStorage.getItem('runrajya_active'))?.zones || 0)

  // GPS & Interaction
  const { position, distance, heading, accuracy, error, requestCompassPermission } = useGPS(sessionActive)
  const [zoom, setZoom] = useState(13)
  const [profiles, setProfiles] = useState({})
  const [autoCenter, setAutoCenter] = useState(true)
  const [hasCenteredOnce, setHasCenteredOnce] = useState(false)
  const [pocketMode, setPocketMode] = useState(false)
  const [lockHoldPercent, setLockHoldPercent] = useState(0)
  const [sliderValue, setSliderValue] = useState(0)
  const [showPreSessionModal, setShowPreSessionModal] = useState(false)

  const mask = useMemo(() => buildMask(rupandehiBoundary), [])
  const lockInterval = useRef(null)
  const wakeLock = useRef(null)

  // Sync Profiles
  useEffect(() => {
    supabase.from('profiles').select('id, color').then(({ data }) => {
      const m = {}; data?.forEach(p => m[p.id] = p); setProfiles(m)
    })
  }, [])

  // Auto-Save Session
  useEffect(() => {
    if (sessionActive) {
      localStorage.setItem('runrajya_active', JSON.stringify({ active: true, id: sessionId, points, zones: zonesCount }))
    }
  }, [sessionActive, points, zonesCount, sessionId])

  // Wake Lock Failsafe
  useEffect(() => {
    const handleWake = async () => {
      if ('wakeLock' in navigator && (sessionActive || pocketMode)) {
        try { wakeLock.current = await navigator.wakeLock.request('screen') } catch (e) {}
      }
    }
    handleWake()
    return () => wakeLock.current?.release()
  }, [sessionActive, pocketMode])

  // CAPTURE ENGINE
  useEffect(() => {
    if (!position || !sessionActive || !userId) return

    zones.forEach(zone => {
      const centerLat = (zone.lat_min + zone.lat_max) / 2
      const centerLng = (zone.lng_min + zone.lng_max) / 2
      const dist = haversine(position.lat, position.lng, centerLat, centerLng)

      // Radius Reveal
      if (dist < REVEAL_RADIUS && !zone.revealed) {
        updateZone({ ...zone, revealed: true })
      }

      // Inside Cell Check
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max

      if (inside && zone.owner_id !== userId) {
        const contested = zone.owner_id !== null
        // 1. Local Optimistic Paint (Updates Map immediately)
        updateZone({ ...zone, owner_id: userId, revealed: true })
        setPoints(p => p + (contested ? 25 : 10))
        setZonesCount(z => z + 1)
        
        // 2. Queue for Sync (Pushes to Database)
        queueCapture({ 
          zoneId: zone.id, 
          userId: userId, 
          capturedAt: new Date().toISOString(), 
          contested: contested 
        })
      }
    })

    if (sessionId) {
      queueTrace({ 
        session_id: sessionId, 
        latitude: position.lat, 
        longitude: position.lng, 
        recorded_at: new Date().toISOString() 
      })
    }
  }, [position, sessionActive])

  // HANDLERS
  const handleLockStart = (e) => {
    e.preventDefault()
    let start = Date.now()
    lockInterval.current = setInterval(() => {
      let p = Math.min(((Date.now() - start) / 1500) * 100, 100)
      setLockHoldPercent(p)
      if (p >= 100) { clearInterval(lockInterval.current); setPocketMode(true); setLockHoldPercent(0) }
    }, 50)
  }

  const confirmStart = async () => {
    setShowPreSessionModal(false)
    await requestCompassPermission()
    let sid = `offline-${Date.now()}`
    if (isOnline) {
      const { data } = await supabase.from('sessions').insert({ user_id: userId, started_at: new Date().toISOString() }).select().single()
      if (data) sid = data.id
    }
    setSessionId(sid); setSessionActive(true)
  }

  const endSession = async () => {
    if (isOnline && sessionId && !String(sessionId).startsWith('offline')) {
      await supabase.from('sessions').update({ ended_at: new Date().toISOString(), distance_m: distance, points, zones_captured: zonesCount }).eq('id', sessionId)
    }
    localStorage.removeItem('runrajya_active')
    setSessionActive(false); setSessionId(null); setPoints(0); setZonesCount(0); setPocketMode(false)
  }

  const compassIcon = useMemo(() => {
    if (!position) return null
    const color = profile?.color || '#3b82f6'
    const contrast = getContrastColor(color)
    return L.divIcon({
      className: 'custom-icon',
      html: `
        <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
          <div style="position:absolute;width:80px;height:80px;transform:rotate(${heading || 0}deg);background:radial-gradient(circle at 50% 50%, ${contrast}44 0%, transparent 70%);clip-path:polygon(50% 50%, 25% 0%, 75% 0%);"></div>
          <div style="width:14px;height:14px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(0,0,0,0.5);z-index:10;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};"></div>
          </div>
        </div>`,
      iconSize: [40, 40], iconAnchor: [20, 20]
    })
  }, [position, heading, profile])

  return (
    <div className="flex flex-col w-full h-full bg-[#080810] fixed inset-0 overflow-hidden">
      
      {/* MAP VIEW (65%) */}
      <div className="w-full h-[65%] relative border-b border-[#1e2042]">
        <MapContainer center={CENTER} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <GeoJSON data={rupandehiBoundary} style={{ color: '#ffffff', weight: 1, opacity: 0.3, fillOpacity: 0 }} />
          <GeoJSON data={mask} style={{ fillColor: '#000000', fillOpacity: 0.8, stroke: false }} />
          <MapEngine position={position} autoCenter={autoCenter} setAutoCenter={setAutoCenter} hasCenteredOnce={hasCenteredOnce} setHasCenteredOnce={setHasCenteredOnce} />
          {zoom >= 11 && <ZoneLayer zones={zones} profiles={profiles} />}
          {position && <Marker position={[position.lat, position.lng]} icon={compassIcon} />}
          <ZoomControl position="bottomleft" />
        </MapContainer>

        {/* GPS ALERT */}
        {(error || !position) && (
          <div className="absolute top-24 left-4 right-4 z-[1000] bg-red-900/90 p-3 rounded-xl border border-red-500 text-[10px] text-white font-bold uppercase tracking-widest text-center">
            {error || 'Acquiring GPS Satellite Lock...'}
          </div>
        )}
      </div>

      {/* COCKPIT (35%) */}
      <div className="w-full h-[35%] bg-[#0f1020] p-5 flex flex-col justify-between box-border">
        {sessionActive ? (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
              <span>{isOnline ? '🟢 Network Live' : '🔴 Offline'}</span>
              <span>Sync Queue: {pendingCount}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Dist</div>
                <div className="text-lg font-black text-white">{Math.round(distance)}m</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Score</div>
                <div className="text-lg font-black text-blue-400">+{points}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl text-center border border-white/5">
                <div className="text-[9px] text-slate-500 font-bold uppercase mb-1">Grids</div>
                <div className="text-lg font-black text-white">{zonesCount}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAutoCenter(!autoCenter)} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase">{autoCenter ? '🎯 Locked' : '🔓 Free'}</button>
              <button onTouchStart={handleLockStart} onTouchEnd={() => { clearInterval(lockInterval.current); setLockHoldPercent(0); }} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white relative overflow-hidden uppercase">
                <div className="absolute inset-y-0 left-0 bg-blue-500/20" style={{ width: `${lockHoldPercent}%` }} />
                🔒 Hold to Lock
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-5xl mb-2">👟</div>
            <h2 className="text-white font-black text-lg uppercase italic">RunRajya</h2>
            <p className="text-slate-500 text-[10px] font-bold tracking-[0.3em] uppercase">Rupandehi Conquest</p>
          </div>
        )}

        <button 
          onClick={sessionActive ? endSession : () => setShowPreSessionModal(true)} 
          className={`w-full py-5 rounded-2xl text-xs font-black tracking-widest uppercase transition-all ${sessionActive ? 'bg-red-600' : 'bg-blue-600'}`}
        >
          {sessionActive ? '⏹ End Operation' : '▶ Start Conquest'}
        </button>
      </div>

      {/* OVERLAY: MODAL */}
      {showPreSessionModal && (
        <div className="fixed inset-0 z-[5000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-[#0f1020] border border-white/10 w-full max-w-sm rounded-[40px] p-10 text-center">
            <div className="text-6xl mb-6">🛰️</div>
            <h2 className="text-white text-2xl font-black mb-10">Step Outdoors</h2>
            <button onClick={confirmStart} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl">Begin</button>
            <button onClick={() => setShowPreSessionModal(false)} className="w-full py-5 text-slate-500 font-black text-xs uppercase tracking-widest mt-2">Cancel</button>
          </div>
        </div>
      )}

      {/* OVERLAY: POCKET LOCK */}
      {pocketMode && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-around p-10 touch-none select-none">
          <div className="text-center">
            <div className="text-8xl mb-8 animate-pulse">🔒</div>
            <h1 className="text-white font-black text-4xl tracking-tighter italic uppercase">Pocket Locked</h1>
          </div>
          <div className="relative h-24 w-full max-w-xs bg-white/5 rounded-[35px] border border-white/10 p-2 flex items-center overflow-hidden">
            <input type="range" min="0" max="100" value={sliderValue} onChange={(e) => { setSliderValue(e.target.value); if(e.target.value >= 90) setPocketMode(false); }} onTouchEnd={() => setSliderValue(0)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
            <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-3xl shadow-2xl transition-all" style={{ marginLeft: `${sliderValue * 0.75}%` }}>→</div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-500/30 pointer-events-none uppercase tracking-[0.4em]">Slide to Unlock</div>
          </div>
        </div>
      )}
    </div>
  )
}