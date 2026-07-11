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
  const [dotMenuOpen, setDotMenuOpen] = useState(false)
  const [showLanding, setShowLanding] = useState(true)
  const isMobile = useIsMobile()
  const dotRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (dotRef.current && !dotRef.current.contains(e.target)) {
        setDotMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [])

  function handleSignOut() {
    signOut()
    setShowLanding(true)
  }

  if (loading) return (
    <div style={{ height: '100dvh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#64748b', fontSize: 14 }}>Loading...</p>
    </div>
  )

  // 1. Show Landing page if showLanding is true (regardless of auth state)
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

  // 2. If landing dismissed and NOT logged in, show Auth
  if (!user) {
    return <Auth />
  }

  // 3. If landing dismissed and IS logged in, render Map & Dashboard UI
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

      {/* Top Navigation */}
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
            onClick={() => setShowLanding(true)} // Tapping logo returns back to landing page
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
              border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, flexShrink: 0, cursor: 'pointer'
            }}
          >
            🏃
          </button>
          <span 
            onClick={() => setShowLanding(true)}
            style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer' }}
          >
            Run<span style={{ color: '#3b82f6' }}>Rajya</span>
          </span>
        </div>

        {isMobile ? (
          <div style={{ display: 'flex', background: '#0f1020', borderRadius: 10, padding: 3, gap: 2, border: '1px solid #1e2042' }}>
            {[
              { key: 'map', label: '🗺', text: 'Map' },
              { key: 'leaderboard', label: '🏆', text: 'Ranks' },
              { key: 'profile', label: '👤', text: 'Me' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setPage(tab.key)}
                style={{
                  padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 600,
                  background: page === tab.key ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                  color: page === tab.key ? 'white' : '#64748b',
                  whiteSpace: 'nowrap', transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span>{tab.label}</span><span>{tab.text}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: profile?.color, boxShadow: `0 0 8px ${profile?.color}` }} />
            <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{profile?.username}</span>
          </div>
        )}

        {isMobile ? (
          <div ref={dotRef} style={{ position: 'relative', minWidth: 90, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setDotMenuOpen(prev => !prev)}
              style={{ background: '#0f1020', border: '1px solid #1e2042', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: profile?.color }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#475569' }} />
            </button>

            {dotMenuOpen && (
              <div className="glass" style={{
                position: 'absolute', top: 42, right: 0,
                background: 'rgba(15, 16, 32, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid #1e2042', borderRadius: 12, overflow: 'hidden',
                zIndex: 3000, minWidth: 160, boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              }}>
                <div style={{ padding: '12px 14px', borderBottom: '1px solid #1e2042' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: profile?.color }} />
                    <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>{profile?.username}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setDotMenuOpen(false); handleSignOut() }}
                  style={{ width: '100%', padding: '11px 14px', background: 'none', border: 'none', color: '#f87171', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ minWidth: 90, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleSignOut} style={{ color: '#64748b', fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        )}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* MAP PAGE */}
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

        {/* MOBILE PAGES */}
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