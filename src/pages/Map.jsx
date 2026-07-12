import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, useMapEvents, useMap } from 'react-leaflet'
import { useAuth } from '../context/AuthContext'
import { useState, useMemo, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import rupandehiBoundary from '../data/rupandehi_boundary.json'
import { useZones } from '../hooks/useZones'
import { useGPS } from '../hooks/useGPS'
import { useOfflineSync } from '../hooks/useOfflineSync'
import L from 'leaflet'

const CENTER = [27.55, 83.42]
const REVEAL_RADIUS = 150

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function buildMask(geoJsonFeature) {
  const coords = geoJsonFeature.geometry.coordinates[0]
  const worldRing = [[-90, -180], [-90, 180], [90, 180], [90, -180]]
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [
        worldRing.map(([lat, lng]) => [lng, lat]),
        coords
      ]
    }
  }
}

const borderStyle = {
  color: '#ffffff', weight: 1.5, opacity: 0.4,
  fillOpacity: 0, interactive: false,
}

const maskStyle = {
  color: 'transparent', fillColor: '#000000',
  fillOpacity: 0.75, interactive: false, stroke: false,
}

function ZoneLayer({ zones, profiles }) {
  return zones
    .filter(zone => zone.revealed)
    .map(zone => {
      const bounds = [[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]
      const owner = profiles[zone.owner_id]
      const color = owner?.color || '#ffffff'
      const isCaptured = !!zone.owner_id
      return (
        <Rectangle
          key={zone.id}
          bounds={bounds}
          pathOptions={{
            color: isCaptured ? color : '#ffffff',
            weight: 0.5,
            opacity: isCaptured ? 0.8 : 0.3,
            fillColor: isCaptured ? color : '#ffffff',
            fillOpacity: isCaptured ? 0.35 : 0.03,
            interactive: false,
          }}
        />
      )
    })
}

function ZoomTracker({ onZoomChange }) {
  useMapEvents({
    zoomend(e) { onZoomChange(e.target.getZoom()) }
  })
  return null
}

// Handles camera positioning onto the player's marker
function MapCentering({ position, autoCenter, hasCenteredOnce, setHasCenteredOnce }) {
  const map = useMap()
  useEffect(() => {
    if (position && autoCenter) {
      if (!hasCenteredOnce) {
        // Snaps to maximum zoom limit (14) on first satellite lock
        map.setView([position.lat, position.lng], 14, { animate: true })
        setHasCenteredOnce(true)
      } else {
        // Continuous updates follow user zoom choices
        map.setView([position.lat, position.lng], map.getZoom(), {
          animate: true,
          duration: 1,
        })
      }
    }
  }, [position, autoCenter, hasCenteredOnce, setHasCenteredOnce, map])
  return null
}

// Listens to manual panning and temporarily disables camera auto-centering
function MapInteractionTracker({ setAutoCenter }) {
  useMapEvents({
    dragstart() {
      setAutoCenter(false)
    }
  })
  return null
}

async function revealAndCapture(
  position, zones, userId, onCapture,
  sessionId, updateZone, isOnline, queueTrace, queueCapture
) {
  const traceData = {
    session_id: sessionId,
    latitude: position.lat,
    longitude: position.lng,
    recorded_at: new Date().toISOString(),
  }

  if (sessionId) {
    if (isOnline) {
      await supabase.from('traces').insert(traceData)
    } else {
      queueTrace(traceData)
      console.log('Offline — trace queued')
    }
  }

  for (const zone of zones) {
    const centerLat = (zone.lat_min + zone.lat_max) / 2
    const centerLng = (zone.lng_min + zone.lng_max) / 2
    const dist = haversine(position.lat, position.lng, centerLat, centerLng)

    if (dist < REVEAL_RADIUS && !zone.revealed) {
      if (isOnline) {
        await supabase.from('zones').update({ revealed: true }).eq('id', zone.id)
      }
      updateZone({ ...zone, revealed: true })
    }

    const inside =
      position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
      position.lng >= zone.lng_min && position.lng <= zone.lng_max

    if (inside && zone.owner_id === userId) continue

    if (inside && zone.owner_id !== userId) {
      const isContested = zone.owner_id !== null

      if (isOnline) {
        const { error } = await supabase.from('zones')
          .update({
            owner_id: userId,
            captured_at: new Date().toISOString(),
            contested: isContested,
            revealed: true,
          })
          .eq('id', zone.id)

        if (!error) {
          updateZone({ ...zone, owner_id: userId, contested: isContested, revealed: true })
          onCapture(zone, isContested)
        }
      } else {
        queueCapture({
          zoneId: zone.id,
          userId,
          capturedAt: new Date().toISOString(),
          contested: isContested,
        })
        console.log('Offline — capture queued')
      }
    }
  }
}

// Maps high contrast complementary colors dynamically to keep compass visible inside captured cells
function getContrastColor(hex) {
  const lowerHex = hex.toLowerCase()
  const mapping = {
    '#ff4757': '#00cec9', // Crimson (Red) -> Cyan (Electric Teal)
    '#2ed573': '#ff4757', // Emerald (Green) -> Crimson (Red)
    '#1e90ff': '#ffa502', // Azure (Blue) -> Amber (Orange)
    '#ffa502': '#1e90ff', // Amber (Orange) -> Azure (Blue)
    '#a29bfe': '#ffa502', // Royal (Purple) -> Amber (Orange)
    '#cbd5e1': '#ff4757', // Platinum (Solo) -> Crimson (Red)
  }
  return mapping[lowerHex] || '#00cec9'
}

function GPSHandler({
  position, heading, sessionActive, zones, userId, userColor,
  onCapture, sessionId, updateZone, isOnline, queueTrace, queueCapture
}) {
  useEffect(() => {
    if (!position || !sessionActive) return
    revealAndCapture(
      position, zones, userId, onCapture,
      sessionId, updateZone, isOnline, queueTrace, queueCapture
    )
  }, [position, sessionActive, zones, userId, onCapture, sessionId, updateZone, isOnline, queueTrace, queueCapture])

  const safeColor = userColor || '#3b82f6'
  const contrastColor = getContrastColor(safeColor)

  const compassIcon = useMemo(() => {
    if (!position) return null
    const rotation = heading !== null ? heading : 0

    return L.divIcon({
      className: 'gps-conquest-pointer',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          
          <!-- 1. Blinking Pulse Radar Waves (Emits only when sessionActive is true) -->
          ${sessionActive ? `
            <div class="radar-pulse-ring" style="
              position: absolute;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: 2.5px solid ${safeColor};
              opacity: 0;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(0.4);
              animation: conquestPulse 1.8s infinite ease-out;
            "></div>
            <div class="radar-pulse-ring" style="
              position: absolute;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              border: 2.5px solid ${safeColor};
              opacity: 0;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) scale(0.4);
              animation: conquestPulse 1.8s infinite ease-out;
              animation-delay: 0.9s;
            "></div>
          ` : ''}

          <!-- 2. Facing Direction Cone Beacon -->
          ${heading !== null ? `
            <div style="
              position: absolute;
              width: 80px;
              height: 80px;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(${rotation}deg);
              transition: transform 0.1s ease-out;
              background: radial-gradient(circle at 50% 50%, ${contrastColor}45 0%, ${contrastColor}15 35%, transparent 65%);
              clip-path: polygon(50% 50%, 25% 0%, 75% 0%);
              pointer-events: none;
              z-index: 1;
            "></div>
          ` : ''}

          <!-- 3. Outer White Frame Border Ring -->
          <div style="
            position: absolute;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: white;
            box-shadow: 0 3px 8px rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 5;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
          ">
            <!-- 4. Solid Center Faction Core Dot -->
            <div style="
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: ${safeColor};
            "></div>
          </div>

        </div>

        <!-- Localized GPU-Accelerated Animations -->
        <style>
          @keyframes conquestPulse {
            0% {
              transform: translate(-50%, -50%) scale(0.4);
              opacity: 0.8;
            }
            100% {
              transform: translate(-50%, -50%) scale(2.4);
              opacity: 0;
            }
          }
        </style>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    })
  }, [position, heading, sessionActive, safeColor, contrastColor])

  return position && compassIcon ? (
    <Marker 
      position={[position.lat, position.lng]} 
      icon={compassIcon} 
      interactive={false} 
    />
  ) : null
}

export default function Map() {
  const { profile } = useAuth()
  
  // 1. Hot recovery: Initialize React states directly from localStorage cache if active
  const [sessionActive, setSessionActive] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('runrajya-active-run'))
      return cached ? cached.sessionActive : false
    } catch { return false }
  })
  const [sessionId, setSessionId] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('runrajya-active-run'))
      return cached ? cached.sessionId : null
    } catch { return null }
  })
  const [points, setPoints] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('runrajya-active-run'))
      return cached ? cached.points : 0
    } catch { return 0 }
  })
  const [zonesCount, setZonesCount] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('runrajya-active-run'))
      return cached ? cached.zonesCount : 0
    } catch { return 0 }
  })

  const [profiles, setProfiles] = useState({})
  const [zoom, setZoom] = useState(13)
  const { zones, updateZone } = useZones()
  
  // Track location and compass constantly
  const { position, distance, accuracy, error, heading, requestCompassPermission } = useGPS(sessionActive)
  const { isOnline, syncing, pendingCount, queueTrace, queueCapture } = useOfflineSync()
  const mask = useMemo(() => buildMask(rupandehiBoundary), [])

  // Viewport center locks
  const [autoCenter, setAutoCenter] = useState(true)
  const [hasCenteredOnce, setHasCenteredOnce] = useState(false)

  const [pocketMode, setPocketMode] = useState(false)
  const [showSlider, setShowSlider] = useState(false)
  const [sliderValue, setSliderValue] = useState(0)
  const [sliderCountdown, setSliderCountdown] = useState(3)

  const [lockHoldPercent, setLockHoldPercent] = useState(0)
  const [unlockHoldPercent, setUnlockHoldPercent] = useState(0)

  const [showPreSessionModal, setShowPreSessionModal] = useState(false)
  const [showTutorialOverlay, setShowTutorialOverlay] = useState(false)

  const lockHoldInterval = useRef(null)
  const unlockHoldInterval = useRef(null)
  const sliderTimeout = useRef(null)
  const sliderCountdownInterval = useRef(null)
  const wakeLockRef = useRef(null)

  // 2. Real-time Auto-Save Loop: backup session metrics to persistent storage on every change
  useEffect(() => {
    if (sessionActive && sessionId) {
      const runState = {
        sessionActive,
        sessionId,
        points,
        zonesCount,
        distance // synced from useGPS hook
      }
      localStorage.setItem('runrajya-active-run', JSON.stringify(runState))
    }
  }, [sessionActive, sessionId, points, zonesCount, distance])

  async function requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen')
        console.log('Wake Lock active — screen will not turn off.')
      } catch (err) {
        console.warn('Wake Lock request failed:', err.message)
      }
    }
  }

  function releaseWakeLock() {
    if (wakeLockRef.current) {
      wakeLockRef.current.release()
        .then(() => {
          wakeLockRef.current = null
          console.log('Wake Lock released.')
        })
        .catch(err => {
          console.warn('Wake Lock release failed:', err.message)
        })
    }
  }

  useEffect(() => {
    if (sessionActive || pocketMode) {
      requestWakeLock()
    } else {
      releaseWakeLock()
    }
    return () => releaseWakeLock()
  }, [sessionActive, pocketMode])

  useEffect(() => {
    async function handleVisibilityChange() {
      if (wakeLockRef.current !== null && document.visibilityState === 'visible') {
        await requestWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleLockStart = (e) => {
    e.preventDefault()
    setLockHoldPercent(0)
    const startTime = Date.now()
    lockHoldInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const percent = Math.min((elapsed / 2000) * 100, 100)
      setLockHoldPercent(percent)
      if (percent >= 100) {
        clearInterval(lockHoldInterval.current)
        setPocketMode(true)
        setLockHoldPercent(0)
      }
    }, 50)
  }

  const handleLockEnd = (e) => {
    if (e) e.preventDefault()
    if (lockHoldInterval.current) clearInterval(lockHoldInterval.current)
    setLockHoldPercent(0)
  }

  const handleUnlockHoldStart = (e) => {
    e.preventDefault()
    setUnlockHoldPercent(0)
    const startTime = Date.now()
    unlockHoldInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const percent = Math.min((elapsed / 2000) * 100, 100)
      setUnlockHoldPercent(percent)
      if (percent >= 100) {
        clearInterval(unlockHoldInterval.current)
        setUnlockHoldPercent(0)
        setShowSlider(true)
        startSliderSystem()
      }
    }, 50)
  }

  const handleUnlockHoldEnd = (e) => {
    if (e) e.preventDefault()
    if (unlockHoldInterval.current) clearInterval(unlockHoldInterval.current)
    setUnlockHoldPercent(0)
  }

  const startSliderSystem = () => {
    if (sliderTimeout.current) clearTimeout(sliderTimeout.current)
    if (sliderCountdownInterval.current) clearInterval(sliderCountdownInterval.current)

    setSliderCountdown(3)
    setSliderValue(0)

    sliderCountdownInterval.current = setInterval(() => {
      setSliderCountdown(prev => Math.max(prev - 1, 0))
    }, 1000)

    sliderTimeout.current = setTimeout(() => {
      setShowSlider(false)
      setSliderValue(0)
      if (sliderCountdownInterval.current) clearInterval(sliderCountdownInterval.current)
    }, 3000)
  }

  const handleSliderChange = (e) => {
    const val = parseInt(e.target.value, 10)
    setSliderValue(val)

    if (val >= 95) {
      if (sliderTimeout.current) clearTimeout(sliderTimeout.current)
      if (sliderCountdownInterval.current) clearInterval(sliderCountdownInterval.current)
      setPocketMode(false)
      setShowSlider(false)
      setSliderValue(0)
    }
  }

  const handleSliderRelease = () => {
    if (sliderValue < 95) {
      setSliderValue(0)
    }
  }

  useEffect(() => {
    return () => {
      if (lockHoldInterval.current) clearInterval(lockHoldInterval.current)
      if (unlockHoldInterval.current) clearInterval(unlockHoldInterval.current)
      if (sliderTimeout.current) clearTimeout(sliderTimeout.current)
      if (sliderCountdownInterval.current) clearInterval(sliderCountdownInterval.current)
    }
  }, [])

  useEffect(() => {
    async function fetchProfiles() {
      const { data } = await supabase.from('profiles').select('*')
      if (data) {
        const map = {}
        data.forEach(p => map[p.id] = p)
        setProfiles(map)
      }
    }
    fetchProfiles()
  }, [])

  // 3. Robust Background Sync: uses a mutable React Ref to read live distance securely
  const distanceRef = useRef(distance)
  useEffect(() => {
    distanceRef.current = distance
  }, [distance])

  useEffect(() => {
    if (!sessionActive || !sessionId || !isOnline) return
    const interval = setInterval(async () => {
      await supabase
        .from('sessions')
        .update({ distance_m: distanceRef.current })
        .eq('id', sessionId)
    }, 30000)
    return () => clearInterval(interval)
  }, [sessionActive, sessionId, isOnline]) // Wiped 'distance' from dependencies to prevent infinite thrashing loops

  async function handleSession() {
    if (sessionActive) {
      if (sessionId && isOnline && !String(sessionId).startsWith('offline-')) {
        await supabase
          .from('sessions')
          .update({
            ended_at: new Date().toISOString(),
            distance_m: distance,
            points: points,
            zones_captured: zonesCount,
          })
          .eq('id', sessionId)
      }
      
      // Wipe the auto-save cache on complete run finalization
      localStorage.removeItem('runrajya-active-run')

      setSessionId(null)
      setSessionActive(false)
      setZonesCount(0)
      setPoints(0)
      setPocketMode(false)
      setShowSlider(false)
    } else {
      setShowPreSessionModal(true)
    }
  }

  async function confirmStartSession() {
    setShowPreSessionModal(false)
    
    // Explicit compass calibration permission trigger (crucial for iOS gesture requirements)
    await requestCompassPermission()

    if (isOnline) {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: profile.id,
          started_at: new Date().toISOString(),
          distance_m: 0,
          points: 0,
          zones_captured: 0,
        })
        .select()
        .single()

      if (!error && data) {
        setSessionId(data.id)
        setSessionActive(true)
        setShowTutorialOverlay(true)
      } else {
        console.error('Session start error:', error)
      }
    } else {
      setSessionId('offline-' + Date.now())
      setSessionActive(true)
      setShowTutorialOverlay(true)
    }
  }

  async function handleCapture(zone, isContested) {
    const earned = isContested ? 25 : 10
    const newPoints = points + earned
    const newZonesCount = zonesCount + 1
    setPoints(newPoints)
    setZonesCount(newZonesCount)

    if (sessionId && isOnline && !String(sessionId).startsWith('offline-')) {
      await supabase
        .from('sessions')
        .update({
          points: newPoints,
          zones_captured: newZonesCount,
          distance_m: distance,
        })
        .eq('id', sessionId)
    }
  }

  return (
    <div className="flex flex-col md:flex-row w-full h-full overflow-hidden bg-[#080810] relative">

      {/* 1. MAP CANVAS CONSOLE (Desktop: Full-screen, Mobile: Compact Square Panel at the top) */}
      <div className="w-full h-[40dvh] md:h-full md:flex-1 relative border-b md:border-b-0 md:border-r border-[#1e2042]">
        <MapContainer
          center={CENTER}
          zoom={10}
          style={{ position: 'absolute', inset: 0 }}
          maxBounds={[[27.2, 83.0], [27.9, 83.8]]}
          maxBoundsViscosity={1.0}
          minZoom={10} // Zoom limits strictly adjusted
          maxZoom={17} // Zoom limits strictly adjusted
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
            updateWhenIdle={true}
            updateWhenZooming={false}
            keepBuffer={1}
            bounds={[[27.3301647, 83.2042469], [27.7672862, 83.6343973]]}
          />
          <GeoJSON data={rupandehiBoundary} style={borderStyle} />
          <GeoJSON data={mask} style={maskStyle} />
          <ZoomTracker onZoomChange={setZoom} />
          
          {/* Dynamic tracking camera focus locks */}
          <MapCentering 
            position={position} 
            autoCenter={autoCenter} 
            hasCenteredOnce={hasCenteredOnce} 
            setHasCenteredOnce={setHasCenteredOnce} 
          />
          <MapInteractionTracker setAutoCenter={setAutoCenter} />

          {zoom >= 11 && <ZoneLayer zones={zones} profiles={profiles} />}
          
          <GPSHandler
            position={position}
            heading={heading} // Compass angle state
            sessionActive={sessionActive} // Pulse radar trigger
            zones={zones}
            userId={profile?.id}
            userColor={profile?.color}
            onCapture={handleCapture}
            sessionId={sessionId}
            updateZone={updateZone}
            isOnline={isOnline}
            queueTrace={queueTrace}
            queueCapture={queueCapture}
          />
        </MapContainer>

        {/* GLOBAL ALWAYS-VISIBLE STATUS/ERROR BANNER */}
        {(error || !position) && (
          <div style={{
            position: 'absolute',
            top: 12, // Always positioned cleanly inside the map container
            left: 12,
            right: 12,
            zIndex: 1000,
            background: error ? 'rgba(220, 38, 38, 0.95)' : 'rgba(15, 16, 32, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: 12,
            padding: '12px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            border: error ? '1px solid #ef4444' : '1px solid #1e2042',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            maxWidth: 320,
            boxSizing: 'border-box'
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{error ? '❌' : '🛰️'}</span>
            <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 700, lineHeight: '1.4' }}>
              {error ? error : 'Acquiring GPS signal... Please step outside or check browser location permission.'}
            </span>
          </div>
        )}

        {/* DESKTOP-ONLY INTERFACE BUTTONS (Hidden on mobile as they are integrated in the bottom console) */}
        <div className="hidden md:block">
          {/* RECENTER CAMERA / FOLLOW TARGET BUTTON */}
          {position && !pocketMode && (
            <button
              onClick={() => setAutoCenter(prev => !prev)}
              style={{
                position: 'absolute',
                bottom: 148,
                right: 16,
                zIndex: 1000,
                background: '#0f1020',
                border: '1px solid #1e2042',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Toggle Auto-Recenter Follow"
            >
              <img 
                src="/logo.svg" // Points directly to public/logo.svg
                alt="Recenter Map" 
                style={{ 
                  width: 24, 
                  height: 24, 
                  objectFit: 'contain',
                  filter: autoCenter 
                    ? `brightness(0) invert(1) drop-shadow(0 0 4px ${profile?.color || '#3b82f6'})` 
                    : 'grayscale(100%) opacity(50%)'
                }} 
              />
            </button>
          )}

          {/* LOCK TRIGGER BUTTON */}
          {sessionActive && !pocketMode && (
            <button
              onTouchStart={handleLockStart}
              onTouchEnd={handleLockEnd}
              onTouchCancel={handleLockEnd}
              onMouseDown={handleLockStart}
              onMouseUp={handleLockEnd}
              onMouseLeave={handleLockEnd}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                position: 'absolute',
                bottom: 90,
                right: 16,
                zIndex: 1000,
                background: '#0f1020',
                border: '1px solid #1e2042',
                color: '#e2e8f0',
                borderRadius: '50%',
                width: 48,
                height: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'none',
                WebkitTouchCallout: 'none',
              }}
              title="Hold 2s to Lock Screen"
            >
              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 48 48">
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="rgba(59, 130, 246, 0.1)"
                  strokeWidth="2.5"
                  fill="transparent"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="22"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 22}
                  strokeDashoffset={2 * Math.PI * 22 * (1 - lockHoldPercent / 100)}
                  style={{ transition: lockHoldPercent === 0 ? 'none' : 'stroke-dashoffset 0.05s linear' }}
                />
              </svg>
              <span style={{ pointerEvents: 'none' }}>🔒</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MOBILE ATHLETIC COCKPIT CONSOLE (Fitted cleanly at the bottom, taking up remaining area) */}
      <div className="flex md:hidden flex-col flex-1 bg-[#0f1020] border-t border-[#1e2042] p-5 overflow-y-auto box-border gap-4 select-none relative z-10">
        {sessionActive ? (
          <div className="flex flex-col gap-4 animate-[fadeInUp_0.4s_ease-out]">
            
            {/* Console Signal & GPS Sync details */}
            <div className="flex justify-between items-center bg-[#080810] border border-[#1e2042] px-3 py-2 rounded-xl text-[10px] font-bold text-[#94a3b8] tracking-wider uppercase">
              <div className="flex items-center gap-2">
                <span className="animate-pulse inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                <span>Signal: {position ? 'LOCK SECURE' : 'CALIBRATING'}</span>
              </div>
              <div>
                {syncing ? 'Syncing...' : isOnline ? '🟢 Online' : `🔴 Offline (${pendingCount})`}
              </div>
            </div>

            {/* Glowing Athletic Metrics Dashboard */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#14152a] border border-[#1e2042] rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase mb-1">Meters</div>
                <div className="text-xl font-black text-white">{Math.round(distance)}m</div>
              </div>
              <div className="bg-[#14152a] border border-[#1e2042] rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase mb-1">Score</div>
                <div className="text-xl font-black" style={{ color: profile?.color || '#3b82f6' }}>+{points}</div>
              </div>
              <div className="bg-[#14152a] border border-[#1e2042] rounded-xl p-3 text-center">
                <div className="text-[10px] font-bold text-[#64748b] tracking-wider uppercase mb-1">Grids</div>
                <div className="text-xl font-black text-[#1e90ff]">{zonesCount}</div>
              </div>
            </div>

            {/* Tactical Commands row */}
            <div className="grid grid-cols-2 gap-3 mt-1">
              {/* Recenter alignment lock */}
              <button 
                onClick={() => setAutoCenter(prev => !prev)}
                className="py-3 rounded-xl border border-[#1e2042] bg-[#14152a] text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
                style={{ 
                  color: autoCenter ? (profile?.color || '#3b82f6') : '#64748b',
                  borderColor: autoCenter ? `${(profile?.color || '#3b82f6')}33` : '#1e2042'
                }}
              >
                🧭 {autoCenter ? 'Follow: Active' : 'Free Cam'}
              </button>

              {/* Progress-glowing hold lock trigger */}
              <button
                onTouchStart={handleLockStart}
                onTouchEnd={handleLockEnd}
                onTouchCancel={handleLockEnd}
                onMouseDown={handleLockStart}
                onMouseUp={handleLockEnd}
                onMouseLeave={handleLockEnd}
                onContextMenu={(e) => e.preventDefault()}
                className="py-3 rounded-xl border border-[#1e2042] text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer outline-none select-none relative overflow-hidden"
                style={{
                  background: `linear-gradient(to right, rgba(59, 130, 246, 0.15) ${lockHoldPercent}%, #14152a ${lockHoldPercent}%)`,
                  touchAction: 'none',
                  WebkitTouchCallout: 'none',
                }}
              >
                🔒 Hold 2s to Lock
              </button>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <div className="text-5xl mb-4 animate-[bounce_2s_infinite]">👟</div>
            <h4 className="text-md font-extrabold text-white mb-2">Conquest Awaiting</h4>
            <p className="text-[#64748b] text-xs leading-relaxed max-w-[280px] mb-6">
              Ready to claim your territory? Start an active run session to paint grids and gain faction points around Rupandehi.
            </p>
          </div>
        )}
        
        {/* Command Button */}
        <button
          onClick={handleSession}
          className="w-full py-4 mt-auto rounded-xl text-sm font-black text-white bg-gradient-to-r transition-all cursor-pointer border-none shadow-[0_4px_16px_rgba(0,0,0,0.5)] outline-none"
          style={{
            background: sessionActive ? '#dc2626' : 'linear-gradient(135deg, #3b82f6, #1e40af)'
          }}
        >
          {sessionActive ? '⏹ End Run Session' : '▶ Begin Run Session'}
        </button>
      </div>

    </div>
  )
}