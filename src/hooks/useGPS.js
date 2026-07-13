import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';

const ACCURACY_LIMIT = 80;
const MIN_DISTANCE = 3;
const SPEED_LIMIT = 6; // ~21km/h

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export function useGPS(sessionActive) {
  const [position, setPosition] = useState(null);
  const [distance, setDistance] = useState(0);
  const [heading, setHeading] = useState(0);
  const [error, setError] = useState(null);
  
  const lastPos = useRef(null);
  const lastTime = useRef(null);

  // Recovery: Load distance from DB on start
  useEffect(() => {
    db.active_session.get('distance').then(res => {
      if (res && sessionActive) setDistance(res.value);
    });
  }, [sessionActive]);

  // Compass Logic
  useEffect(() => {
    const handleDir = (e) => {
      const h = e.webkitCompassHeading || (360 - e.alpha);
      if (h) setHeading(Math.round(h));
    };
    window.addEventListener('deviceorientationabsolute', handleDir, true);
    window.addEventListener('deviceorientation', handleDir, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleDir, true);
      window.removeEventListener('deviceorientation', handleDir, true);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return setError("GPS Unsupported");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        if (accuracy > ACCURACY_LIMIT) return setError("Low Signal Accuracy");
        
        setError(null);
        const current = { lat: latitude, lng: longitude };
        setPosition(current);

        if (sessionActive && lastPos.current) {
          const d = haversine(lastPos.current.lat, lastPos.current.lng, latitude, longitude);
          const time = (pos.timestamp - lastTime.current) / 1000;
          const speed = d / time;

          if (d >= MIN_DISTANCE && speed <= SPEED_LIMIT) {
            setDistance(prev => {
              const next = prev + d;
              db.active_session.put({ key: 'distance', value: next });
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
      (err) => setError("GPS Signal Lost"),
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [sessionActive]);

  return { 
    position, distance, heading, error, 
    requestCompass: async () => {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') {
        return await DeviceOrientationEvent.requestPermission();
      }
    }
  };
}