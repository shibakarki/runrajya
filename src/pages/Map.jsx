import { MapContainer, TileLayer, GeoJSON, Rectangle, Marker, ZoomControl, useMapEvents, useMap } from 'react-leaflet';
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useZones } from '../hooks/useZones';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { db } from '../lib/db';
import rupandehiBoundary from '../data/rupandehi_boundary.json';
import L from 'leaflet';

export default function IncursionMap({ position, metrics, heading, error, onAbort }) {
  const { profile } = useAuth();
  const { zones, updateZone } = useZones();
  const { isOnline, pendingCount, queueCapture, queueTrace } = useOfflineSync();
  
  // Tactical Feed State
  const [logs, setLogs] = useState([
    { time: new Date().toLocaleTimeString(), msg: "SATELLITE_LINK_ESTABLISHED", color: "text-cyan-400" },
    { time: new Date().toLocaleTimeString(), msg: "SCANNING_RUPANDEHI_SECTOR", color: "text-slate-400" }
  ]);

  const addLog = (msg, color = "text-slate-300") => {
    setLogs(prev => [{ time: new Date().toLocaleTimeString(), msg, color }, ...prev.slice(0, 10)]);
  };

  // Capture Engine
  useEffect(() => {
    if (!position) return;
    
    zones.forEach(zone => {
      const inside = position.lat >= zone.lat_min && position.lat <= zone.lat_max &&
                     position.lng >= zone.lng_min && position.lng <= zone.lng_max;

      if (inside && zone.owner_id !== profile?.id) {
        const contested = zone.owner_id !== null;
        updateZone({ ...zone, owner_id: profile.id, revealed: true });
        
        // Log to Tactical Feed
        addLog(`SECTOR_${zone.id.slice(0,4).toUpperCase()}_CLAIMED`, "text-emerald-400");
        
        queueCapture({ 
          zone_id: zone.id, user_id: profile.id, 
          captured_at: new Date().toISOString(), contested 
        });
      }
    });

    queueTrace({ 
      latitude: position.lat, 
      longitude: position.lng, 
      recorded_at: new Date().toISOString() 
    });
  }, [position]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1b] flex flex-col overflow-hidden">
      
      {/* 1. UPPER TACTICAL HUD */}
      <div className="absolute top-0 inset-x-0 z-[1001] p-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <StatusBadge 
            active={!error} 
            label={error ? "SIGNAL_LOST" : "GPS_HIGH_RES_LOCK"} 
            color={error ? "bg-rose-500" : "bg-emerald-500"} 
          />
          <StatusBadge 
            active={isOnline} 
            label={isOnline ? "ENCRYPTED_UPLINK" : `BUFFERING_DATA: ${pendingCount}`} 
            color={isOnline ? "bg-cyan-500" : "bg-amber-500"} 
          />
        </div>

        {/* Extraction (Abort) Button */}
        <button 
          onClick={onAbort} 
          className="pointer-events-auto w-10 h-10 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center text-cyan-400 shadow-2xl active:scale-90 transition-transform"
        >
          <span className="text-xl font-bold">✕</span>
        </button>
      </div>

      {/* 2. SATELLITE MAP CORE */}
      <div className="flex-grow relative">
        <MapContainer 
          center={[27.55, 83.42]} 
          zoom={15} 
          style={{ height: '100%', width: '100%' }} 
          zoomControl={false}
        >
          {/* HIGH-RES SATELLITE TILES (Esri World Imagery) */}
          <TileLayer 
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          />

          {/* RUPANDEHI OSM BORDER */}
          <GeoJSON data={rupandehiBoundary} style={{ color: '#06b6d4', weight: 2, fillOpacity: 0, dashArray: '5, 10' }} />

          {/* ZONE GRID OVERLAY */}
          {zones.filter(z => z.revealed).map(zone => (
            <Rectangle 
              key={zone.id} 
              bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]} 
              pathOptions={{ 
                fillColor: zone.owner_id ? (zone.owner_id === profile?.id ? profile?.color : '#ff4757') : '#fff', 
                fillOpacity: zone.owner_id ? 0.25 : 0.05, // Lowered opacity for better satellite visibility
                weight: 0.5,
                color: '#ffffff44'
              }} 
            />
          ))}

          {/* PLAYER BEACON */}
          {position && <PlayerMarker position={position} heading={heading} color={profile?.color} />}
          
          <MapAutoCenter position={position} />
        </MapContainer>
      </div>

      {/* 3. LOWER COMMAND CONSOLE */}
      <div className="p-4 bg-[#050b14] border-t border-slate-800 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        
        {/* Tactical Feed */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-4 h-24 overflow-hidden relative shadow-inner">
          <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500"></div>
          <div className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2 flex justify-between">
            <span>Tactical Feed</span>
            <span className="animate-pulse">● LIVE</span>
          </div>
          <div className="space-y-1 font-mono text-[10px] no-scrollbar overflow-y-auto h-12">
            {logs.map((log, i) => (
              <div key={i} className={log.color}>[{log.time}] {log.msg}</div>
            ))}
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-3 gap-2">
            <MiniMetric label="ENERGY" val={Math.round(metrics.kcal)} unit="kcal" />
            <MiniMetric label="TOTAL_DIST" val={Math.round(metrics.distance)} unit="m" />
            <button 
              onClick={() => alert("Pocket Lock: Gesture required to unlock.")} 
              className="bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-lg active:bg-cyan-500/20 transition-colors"
            >
              🔒
            </button>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function StatusBadge({ active, label, color }) {
  return (
    <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 flex items-center space-x-2 shadow-lg">
      <span className={`w-2 h-2 rounded-full ${active ? color : 'bg-slate-700'} animate-pulse`}></span>
      <span className="font-mono text-[8px] font-black text-slate-300 uppercase tracking-tighter">{label}</span>
    </div>
  );
}

function MiniMetric({ label, val, unit }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center shadow-inner">
      <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">{label}</div>
      <div className="flex items-baseline justify-center space-x-0.5">
        <span className="text-sm font-black text-white">{val}</span>
        <span className="text-[8px] text-slate-500 font-bold">{unit}</span>
      </div>
    </div>
  );
}

function PlayerMarker({ position, heading, color = "#06b6d4" }) {
  const icon = L.divIcon({
    className: 'p-icon',
    html: `
      <div style="transform:rotate(${heading}deg); position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
         <div class="radar-pulse" style="position:absolute; width:40px; height:40px; border-radius:50%; border:2px solid ${color};"></div>
         <div style="width:14px; height:14px; background:white; border-radius:50%; border:3px solid ${color}; box-shadow:0 0 15px ${color};"></div>
         <div style="position:absolute; top:-10px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-bottom:12px solid ${color};"></div>
      </div>
      <style>
        @keyframes radarPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .radar-pulse { animation: radarPulse 2s infinite; }
      </style>`
  });
  return <Marker position={[position.lat, position.lng]} icon={icon} />;
}

function MapAutoCenter({ position }) {
  const map = useMap();
  useEffect(() => { 
    if (position) map.panTo([position.lat, position.lng], { animate: true }); 
  }, [position, map]);
  return null;
}