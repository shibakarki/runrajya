import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';

const MET_WALK = 3.5;
const MET_JOG = 7.0;
const MET_RUN = 11.5;

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGPS(sessionActive, weightKg = 70) {
  const [position, setPosition] = useState(null);
  const [metrics, setMetrics] = useState({ distance: 0, kcal: 0 });
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  
  const lastPos = useRef(null);
  const lastTime = useRef(null);

  // Hot Recovery
  useEffect(() => {
    db.active_session.get('metrics').then(res => {
      if (res && sessionActive) setMetrics(res.value);
    });
  }, [sessionActive]);

  useEffect(() => {
    if (!navigator.geolocation) return setError("GPS_NOT_SUPPORTED");

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > 80) return setError("LOW_ACCURACY");
        
        setError(null);
        const current = { lat: latitude, lng: longitude };
        setPosition(current);

        if (sessionActive && lastPos.current) {
          const d = haversine(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
          const timeSec = (pos.timestamp - lastTime.current) / 1000;
          const speedKmh = (d / timeSec) * 3.6;

          if (d >= 3 && speedKmh < 25) {
            let met = MET_WALK;
            if (speedKmh > 6) met = MET_JOG;
            if (speedKmh > 10) met = MET_RUN;

            const kcalBurned = (met * weightKg * (timeSec / 3600));

            setMetrics(prev => {
              const next = { distance: prev.distance + d, kcal: prev.kcal + kcalBurned };
              db.active_session.put({ key: 'metrics', value: next });
              return next;
            });
            lastPos.current = current;
            lastTime.current = pos.timestamp;
          }
        } else {
          lastPos.current = current;
          lastTime.current = pos.timestamp;
        }
      },
      (err) => setError("SIGNAL_LOST"),
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [sessionActive, weightKg]);

  return { position, metrics, heading, error };
}