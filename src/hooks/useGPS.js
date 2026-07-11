import { useState, useEffect, useRef } from 'react'

const ACCURACY_THRESHOLD = 80 // Loosened to 80m for reliable indoor/outdoor testing
const MIN_DISTANCE = 10 // minimum 10m movement before counting
const MAX_SPEED = 6 // max 6 m/s (roughly 20 km/h) — anything faster is GPS noise

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

export function useGPS(sessionActive) {
  const [position, setPosition] = useState(null)
  const [distance, setDistance] = useState(0)
  const [accuracy, setAccuracy] = useState(null)
  const [error, setError] = useState(null)
  const [heading, setHeading] = useState(null) // Compass heading in degrees (0-360)
  
  const lastPos = useRef(null)
  const lastTime = useRef(null)
  const watchId = useRef(null)

  // Reset distance counters when a new session transitions to active
  useEffect(() => {
    if (sessionActive) {
      setDistance(0)
      lastPos.current = null
      lastTime.current = null
    }
  }, [sessionActive])

  // Absolute Compass listeners (Android absolute orientation + iOS Safari compatibility)
  useEffect(() => {
    const handleOrientation = (e) => {
      let compass = null
      
      if (e.webkitCompassHeading !== undefined) {
        // iOS Safari absolute compass heading
        compass = e.webkitCompassHeading
      } else if (e.alpha !== null) {
        // Android / Chrome: calculate absolute heading from standard alpha adjustments
        compass = 360 - e.alpha
      }
      
      if (compass !== null) {
        setHeading(Math.round(compass))
      }
    }

    if (window.DeviceOrientationEvent) {
      // Use absolute orient events if supported (vital for Chrome-based Android browsers)
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true)
      } else {
        window.addEventListener('deviceorientation', handleOrientation, true)
      }
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true)
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [])

  // Explicit gesture call for compass permissions
  const requestCompassPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const permissionState = await DeviceOrientationEvent.requestPermission()
        return permissionState === 'granted'
      } catch (err) {
        console.warn('Compass permissions rejected:', err)
        return false
      }
    }
    return true
  }

  // Always-On Geolocation Watcher
  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    if (!window.isSecureContext) {
      setError('HTTPS Required: Geolocation is disabled on insecure connections on mobile.')
      return
    }

    const options = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000,
    }

    const successCallback = (pos) => {
      const { latitude, longitude, accuracy: acc } = pos.coords
      const now = pos.timestamp

      setAccuracy(acc)
      setError(null)

      if (acc > ACCURACY_THRESHOLD) {
        console.log('Low accuracy:', acc, 'm — discarding')
        return
      }

      const newPos = { lat: latitude, lng: longitude }
      setPosition(newPos)

      // Calculate distance only when session is active
      if (sessionActive) {
        if (lastPos.current && lastTime.current) {
          const d = haversine(
            lastPos.current.lat,
            lastPos.current.lng,
            latitude,
            longitude
          )

          const timeDiff = (now - lastTime.current) / 1000
          const speed = timeDiff > 0 ? d / timeDiff : 0

          if (d < MIN_DISTANCE) return
          if (speed > MAX_SPEED) return

          setDistance(prev => prev + d)
          lastPos.current = newPos
          lastTime.current = now
        } else {
          lastPos.current = newPos
          lastTime.current = now
        }
      } else {
        lastPos.current = newPos
        lastTime.current = now
      }
    }

    const errorCallback = (err) => {
      console.error('GPS error:', err)
      switch (err.code) {
        case 1:
          setError('Location permission denied. Please allow location access in your phone/browser settings.')
          break
        case 2:
          setError('Location unavailable. GPS satellites blocked.')
          break
        case 3:
          setError('GPS timed out.')
          break
        default:
          setError('Unknown GPS error.')
      }
    }

    watchId.current = navigator.geolocation.watchPosition(
      successCallback,
      errorCallback,
      options
    )

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current)
        watchId.current = null
      }
    }
  }, [sessionActive])

  return { position, distance, accuracy, error, heading, requestCompassPermission }
}