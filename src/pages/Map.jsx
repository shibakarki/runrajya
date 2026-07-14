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
  const [logs, setLogs] = useState([{ time: new Date().toLocaleTimeString(), msg: "SYSTEM_INITIALIZED", color: "text-cyan-400" }]);

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
        addLog(`SECTOR_${zone.id.slice(0,4).toUpperCase()}_SECURED`, "text-emerald-400");
        
        queueCapture({ 
          zone_id: zone.id, user_id: profile.id, 
          captured_at: new Date().toISOString(), contested 
        });
      }
    });

    queueTrace({ latitude: position.lat, longitude: position.lng, recorded_at: new Date().toISOString() });
  }, [position]);

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1b] flex flex-col">
      
      {/* Upper Controls */}
      <div className="absolute top-0 inset-x-0 z-[1001] p-4 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <StatusBadge active={!error} label={error ? "SIGNAL_INTERRUPTED" : "GPS_LOCK_SECURE"} color={error ? "bg-rose-500" : "bg-emerald-500"} />
          <StatusBadge active={isOnline} label={isOnline ? "SYNC_ENCRYPTED" : `OFFLINE_QUEUE_${pendingCount}`} color={isOnline ? "bg-cyan-500" : "bg-amber-500"} />
        </div>
        <button onClick={onAbort} className="pointer-events-auto w-10 h-10 bg-slate-950/90 rounded-xl border border-slate-800 flex items-center justify-center text-cyan-400 shadow-2xl">
          ✕
        </button>
      </div>

      {/* Map */}
      <div className="flex-grow">
        <MapContainer center={[27.55, 83.42]} zoom={14} style={{ height: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <GeoJSON data={rupandehiBoundary} style={{ color: '#06b6d4', weight: 1, fillOpacity: 0 }} />
          {zones.filter(z => z.revealed).map(zone => (
            <Rectangle key={zone.id} bounds={[[zone.lat_min, zone.lng_min], [zone.lat_max, zone.lng_max]]} 
              pathOptions={{ fillColor: zone.owner_id ? profile?.color : '#fff', fillOpacity: 0.3, weight: 0.5 }} />
          ))}
          {position && <PlayerMarker position={position} heading={heading} color={profile?.color} />}
          <MapAutoCenter position={position} />
        </MapContainer>
      </div>

      {/* Tactical Feed Console */}
      <div className="p-4 bg-[#050b14] border-t border-slate-800">
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-4 h-24 overflow-hidden relative">
          <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500"></div>
          <div className="text-[8px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2">Tactical Feed</div>
          <div className="space-y-1 font-mono text-[10px]">
            {logs.map((log, i) => (
              <div key={i} className={log.color}>[{log.time}] {log.msg}</div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
            <MiniMetric label="KCAL" val={Math.round(metrics.kcal)} />
            <MiniMetric label="DIST" val={Math.round(metrics.distance) + "m"} />
            <button onClick={() => alert("Pocket Mode Active")} className="bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-center text-xs">🔒</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ active, label, color }) {
  return (
    <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 flex items-center space-x-2">
      <span className={`w-2 h-2 rounded-full ${active ? color : 'bg-slate-700'} animate-pulse`}></span>
      <span className="font-mono text-[8px] font-black text-slate-300 uppercase">{label}</span>
    </div>
  );
}

function MiniMetric({ label, val }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-center">
      <div className="text-[7px] text-slate-500 font-bold uppercase">{label}</div>
      <div className="text-xs font-black text-white">{val}</div>
    </div>
  );
}

function PlayerMarker({ position, heading, color }) {
  const icon = L.divIcon({
    className: 'p-icon',
    html: `<div style="transform:rotate(${heading}deg); position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
             <div class="radar-pulse" style="position:absolute; width:40px; height:40px; border-radius:50%; border:2px solid ${color};"></div>
             <div style="width:12px; height:12px; background:white; border-radius:50%; border:2px solid ${color};"></div>
           </div>`
  });
  return <Marker position={[position.lat, position.lng]} icon={icon} />;
}

function MapAutoCenter({ position }) {
  const map = useMap();
  useEffect(() => { if (position) map.panTo([position.lat, position.lng]); }, [position]);
  return null;
}