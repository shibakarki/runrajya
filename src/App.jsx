import { useState, useEffect, useRef } from 'react'
import { useAuth } from './context/AuthContext'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import Map from './pages/Map'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function App() {
  const { user, profile, loading, signOut } = useAuth()
  const [page, setPage] = useState('map')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('ranks')
  const [showLanding, setShowLanding] = useState(true)
  const isMobile = useIsMobile()

  function handleSignOut() {
    signOut()
    setShowLanding(true)
  }

  if (loading) return (
    <div style={{ height: '100dvh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b', fontSize: 14 }}>Loading...</p>
    </div>
  )

  // Show Landing page if showLanding is true
  if (showLanding) {
    return (
      <Landing 
        user={user}
        profile={profile}
        onGetStarted={() => {
          setShowLanding(false) // Dismiss landing, proceed to Auth or Map depending on user state below
        }}
      />
    )
  }

  // If landing dismissed and NOT logged in, show Auth
  if (!user) {
    return <Auth />
  }

  // If landing dismissed and IS logged in, render Map & Dashboard UI
  return (
    <div style={{
      height: '100dvh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#080810',
      overflow: 'hidden',
      position: 'relative'
    }}>

      {/* TOP NAVIGATION HUD — Desktop Standard Header, Mobile Dynamic Floating Elements */}
      {isMobile ? (
        <>
          {/* A. Top-Left Floating Faction Brand Logo */}
          <div 
            onClick={() => setShowLanding(true)}
            style={{
              position: 'fixed', top: 14, left: 14, zIndex: 2000,
              width: 34, height: 34, borderRadius: 10,
              background: 'linear-gradient(135deg, #0f1020, #080810)',
              border: '1.5px solid #1e2042',
              display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)', cursor: 'pointer'
            }}
          >
            <img 
              src="/logo.svg" 
              alt="Logo" 
              style={{ 
                width: 20, height: 20, objectFit: 'contain',
                filter: 'brightness(0) invert(1)' 
              }} 
            />
          </div>

          {/* B. Floating DYNAMIC ISLAND NAVIGATION PILL */}
          <div style={{
            position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 2000,
            background: 'rgba(15, 16, 32, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid #1e2042',
            padding: 3,
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            boxShadow: '0 10px 32px rgba(0,0,0,0.7)',
            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
          }}>
            {[
              { key: 'map', label: '🗺', text: 'Map' },
              { key: 'leaderboard', label: '🏆', text: 'Ranks' },
              { key: 'profile', label: '👤', text: 'Me' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setPage(tab.key)}
                style={{
                  padding: page === tab.key ? '8px 16px' : '8px 12px', 
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 700,
                  background: page === tab.key ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                  color: page === tab.key ? 'white' : '#64748b',
                  whiteSpace: 'nowrap', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: 4,
                  outline: 'none'
                }}
              >
                <span>{tab.label}</span>
                {page === tab.key && <span style={{ fontSize: 10 }}>{tab.text}</span>}
              </button>
            ))}
          </div>

          {/* C. Direct One-Tap Session Logout Button */}
          <button
            onClick={handleSignOut}
            style={{
              position: 'fixed', top: 14, right: 14, zIndex: 2000,
              width: 34, height: 34, borderRadius: 10,
              background: '#0f1020',
              border: '1.5px solid #1e2042',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)', cursor: 'pointer',
              color: '#f43f5e', fontSize: 14, outline: 'none'
            }}
            title="Disconnect Session"
          >
            🚪
          </button>
        </>
      ) : (
        /* Desktop Traditional Header Layout */
        <div className="glass" style={{
          background: 'rgba(15, 16, 32, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid #1e2042',
          padding: '0 14px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 2000,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
            <button 
              onClick={() => setShowLanding(true)}
              style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'linear-gradient(135deg, #0f1020, #080810)',
                border: '1px solid #1e2042',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, cursor: 'pointer', outline: 'none', padding: 0
              }}
            >
              <img src="/logo.svg" alt="Logo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            </button>
            <span 
              onClick={() => setShowLanding(true)}
              style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer' }}
            >
              Run<span style={{ color: '#3b82f6' }}>Rajya</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: profile?.color, boxShadow: `0 0 8px ${profile?.color}` }} />
            <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{profile?.username}</span>
          </div>

          <div style={{ minWidth: 90, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSignOut} style={{ color: '#64748b', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* MAP PANEL */}
        <div style={{ position: 'absolute', inset: 0, display: page === 'map' ? 'flex' : 'none' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <Map />
          </div>

          {!isMobile && (
            <div style={{ position: 'relative', display: 'flex', zIndex: 1500 }}>
              <div
                onClick={() => setSidebarOpen(prev => !prev)}
                style={{
                  position: 'absolute', left: -28, top: '50%', transform: 'translateY(-50%)',
                  width: 28, height: 64, background: '#0f1020', border: '1px solid #1e2042', borderRight: 'none',
                  borderRadius: '8px 0 0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1500, color: '#64748b', fontSize: 12,
                }}
              >
                {sidebarOpen ? '▶' : '◀'}
              </div>

              <div style={{
                width: sidebarOpen ? 300 : 0, overflow: 'hidden', transition: 'width 0.25s ease',
                background: '#0f1020', borderLeft: '1px solid #1e2042', flexShrink: 0,
                display: 'flex', flexDirection: 'column',
              }}>
                <div style={{ width: 300, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', borderBottom: '1px solid #1a1b2e', flexShrink: 0 }}>
                    {[
                      { key: 'ranks', label: '🏆 Rankings' },
                      { key: 'profile', label: '👤 Profile' },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setSidebarTab(tab.key)}
                        style={{
                          flex: 1, padding: '10px 0', border: 'none',
                          borderBottom: sidebarTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                          background: 'transparent', color: sidebarTab === tab.key ? 'white' : '#64748b',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto' }} className="page-enter" key={sidebarTab}>
                    {sidebarTab === 'ranks' && <Leaderboard sidebar />}
                    {sidebarTab === 'profile' && <Profile sidebar />}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MOBILE OVERLAYS */}
        {isMobile && (
          <div style={{ position: 'absolute', inset: 0, display: page !== 'map' ? 'block' : 'none', overflowY: 'auto', background: '#080810' }}>
            {page === 'leaderboard' && <div className="page-enter animate-fade-in" key="leaderboard"><Leaderboard /></div>}
            {page === 'profile' && <div className="page-enter animate-fade-in" key="profile"><Profile /></div>}
          </div>
        )}

      </div>
    </div>
  )
}