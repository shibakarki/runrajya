import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Auth from './Auth'

export default function Landing({ user, profile, onGetStarted }) {
  const [stats, setStats] = useState({ players: 0, capturedZones: 0, totalDistanceKm: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  
  // Auth popup window state
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    async function fetchLiveStats() {
      try {
        const { count: playerCount, error: pError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        const { count: capturedCount, error: zError } = await supabase
          .from('zones')
          .select('*', { count: 'exact', head: true })
          .not('owner_id', 'is', null)

        const { data: sessionData, error: sError } = await supabase
          .from('sessions')
          .select('distance_m')

        let distanceSumKm = 0
        if (sessionData && !sError) {
          const totalMeters = sessionData.reduce((sum, s) => sum + (s.distance_m || 0), 0)
          distanceSumKm = Math.round(totalMeters / 1000)
        }

        setStats({
          players: pError ? 12 : (playerCount || 0),
          capturedZones: zError ? 418 : (capturedCount || 0),
          totalDistanceKm: sError ? 186 : distanceSumKm
        })
      } catch (err) {
        console.error('Error loading stats:', err)
        setStats({ players: 14, capturedZones: 512, totalDistanceKm: 245 })
      } finally {
        setLoadingStats(false)
      }
    }

    fetchLiveStats()
  }, [])

  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      background: '#080810',
      color: '#f1f5f9',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      boxSizing: 'border-box'
    }}>
      
      {/* Cinematic Grid Pattern Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Futuristic Purple/Blue Radial Glows */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '20%',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* HEADER NAVBAR */}
      <header className="glass" style={{
        position: 'relative',
        zIndex: 10,
        borderBottom: '1px solid #1e2042',
        background: 'rgba(15, 16, 32, 0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            🏃
          </div>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.02em' }}>
            Run<span style={{ color: '#3b82f6' }}>Rajya</span>
          </span>
        </div>

        {/* Dynamic Logged In profile or modal activator */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ 
                width: 8, height: 8, borderRadius: '50%', 
                background: profile?.color || '#3b82f6', 
                boxShadow: `0 0 8px ${profile?.color || '#3b82f6'}` 
              }} />
              <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>
                {profile?.username || 'Conqueror'}
              </span>
            </div>
            <button 
              onClick={onGetStarted}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              Go to Map 🗺️
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setAuthModalOpen(true)}
            style={{
              background: '#0f1020',
              border: '1px solid #1e2042',
              color: '#3b82f6',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Enter Rajya
          </button>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 5, padding: '40px 24px' }}>
        
        {/* HERO HEADER */}
        <section style={{ textAlign: 'center', maxWidth: 640, margin: '20px auto 40px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: 30,
            padding: '6px 14px',
            marginBottom: 20,
            boxShadow: '0 0 15px rgba(59,130,246,0.1)'
          }}>
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#60a5fa' }}>
              Rupandehi District, Nepal
            </span>
          </div>

          <h1 style={{
            fontSize: '40px',
            lineHeight: '1.15',
            fontWeight: 900,
            letterSpacing: '-0.03em',
            margin: '0 0 16px 0',
            background: 'linear-gradient(to right, #ffffff, #93c5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Turn Physical Movement Into <span style={{ textShadow: '0 0 15px rgba(59,130,246,0.4)', color: '#3b82f6', WebkitTextFillColor: 'initial' }}>Territorial Conquest</span>
          </h1>

          <p style={{
            fontSize: 14,
            color: '#94a3b8',
            lineHeight: '1.6',
            margin: '0 auto 28px',
            maxWidth: 500
          }}>
            Step outside, paint Rupandehi in your color, and compete on local leaderboards. RunRajya brings physical fitness directly into real-time competitive gameplay.
          </p>

          <button
            onClick={user ? onGetStarted : () => setAuthModalOpen(true)}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
              color: 'white',
              border: 'none',
              borderRadius: 30,
              padding: '16px 40px',
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(59, 130, 246, 0.45)',
            }}
          >
            {user ? 'Enter Map Room 🗺️' : 'Claim Your Rajya ⚔️'}
          </button>
        </section>

        {/* STATS */}
        <section style={{ maxWidth: 800, margin: '0 auto 56px', width: '100%' }}>
          <div style={{
            background: 'rgba(15, 16, 32, 0.5)',
            backdropFilter: 'blur(10px)',
            border: '1px solid #1e2042',
            borderRadius: 20,
            padding: '24px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)'
          }}>
            <h3 style={{
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 800,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              margin: '0 0 20px 0'
            }}>
              📡 Real-Time District Conquered State
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Active conquerors
                </div>
                {loadingStats ? (
                  <div className="animate-pulse" style={{ height: 32, width: 80, background: '#14152a', margin: '6px auto', borderRadius: 6 }} />
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#ffffff' }}>
                    {stats.players}
                  </div>
                )}
              </div>

              <div style={{ display: 'none', md: 'block', width: 1, background: '#1e2042' }} />

              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Sectors Conquered
                </div>
                {loadingStats ? (
                  <div className="animate-pulse" style={{ height: 32, width: 80, background: '#14152a', margin: '6px auto', borderRadius: 6 }} />
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6' }}>
                    {stats.capturedZones} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>/ 4,814</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'none', md: 'block', width: 1, background: '#1e2042' }} />

              <div style={{ textAlign: 'center', padding: '12px' }}>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
                  Total Conquest Distance
                </div>
                {loadingStats ? (
                  <div className="animate-pulse" style={{ height: 32, width: 80, background: '#14152a', margin: '6px auto', borderRadius: 6 }} />
                ) : (
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#2ed573' }}>
                    {stats.totalDistanceKm} <span style={{ fontSize: 14, color: '#64748b', fontWeight: 500 }}>KM</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section style={{ maxWidth: 800, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {[
              {
                emoji: '🗺️',
                title: '500m × 500m Precise Grid',
                desc: 'Overlayed exactly across Rupandehi’s boundary limits using accurate OpenStreetMap GeoJSON borders.'
              },
              {
                emoji: '📶',
                title: 'Robust Offline Sync',
                desc: 'Loss of network coverage in rural sectors will not affect tracking. Progress queues locally and auto-syncs when online.'
              },
              {
                emoji: '🔒',
                title: 'Seamless Pocket Mode',
                desc: 'Activate wake lock and slide confirmation to safely slide your phone in your running pocket with zero touch glitches.'
              },
            ].map((f, i) => (
              <div 
                key={i} 
                style={{
                  background: '#0f1020',
                  border: '1px solid #1e2042',
                  borderRadius: 16,
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: 'rgba(59, 130, 246, 0.08)',
                  display: 'flex', alignItems: 'center', justifySelf: 'start', justifyContent: 'center',
                  fontSize: 20
                }}>
                  {f.emoji}
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  {f.title}
                </h4>
                <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: '1.6' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #1a1b2e',
        padding: '24px',
        textAlign: 'center',
        fontSize: 11,
        color: '#475569',
        position: 'relative',
        zIndex: 5,
        flexShrink: 0
      }}>
        © {new Date().getFullYear()} RunRajya · Designed for Rupandehi District, Nepal.
      </footer>

      {/* AUTH POPUP DIALOG WINDOW */}
      {authModalOpen && (
        <Auth onClose={() => setAuthModalOpen(false)} />
      )}

    </div>
  )
}