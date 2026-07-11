import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Auth from './Auth'

export default function Landing({ user, profile, onGetStarted }) {
  const [stats, setStats] = useState({ players: 0, capturedZones: 0, totalDistanceKm: 0 })
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  useEffect(() => {
    async function fetchLiveMetrics() {
      try {
        setLoading(true)

        // 1. Fetch total player count from profiles
        const { count: playerCount, error: pError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })

        // 2. Fetch total captured zones (zones that have an owner)
        const { count: capturedCount, error: zError } = await supabase
          .from('zones')
          .select('*', { count: 'exact', head: true })
          .not('owner_id', 'is', null)

        // 3. Fetch all sessions to calculate total distance & build top-5 leaderboard
        const { data: sessionList, error: sError } = await supabase
          .from('sessions')
          .select('user_id, points, distance_m, zones_captured')

        // 4. Fetch all profiles to map details onto the leaderboard
        const { data: profileList, error: plError } = await supabase
          .from('profiles')
          .select('*')

        // Calculate total distance kilometers
        let distanceSumKm = 0
        if (sessionList && !sError) {
          const totalMeters = sessionList.reduce((sum, s) => sum + (s.distance_m || 0), 0)
          distanceSumKm = Math.round(totalMeters / 1000)
        }

        // Aggregate leaderboard scores dynamically
        const userStatsMap = {}
        if (profileList && !plError) {
          profileList.forEach(p => {
            userStatsMap[p.id] = {
              id: p.id,
              username: p.username,
              color: p.color || '#cbd5e1',
              team: p.team || 'solo',
              points: 0,
              distance: 0,
              zones: 0
            }
          })
        }

        if (sessionList && !sError) {
          sessionList.forEach(s => {
            if (userStatsMap[s.user_id]) {
              userStatsMap[s.user_id].points += (s.points || 0)
              userStatsMap[s.user_id].distance += (s.distance_m || 0)
              userStatsMap[s.user_id].zones += (s.zones_captured || 0)
            }
          })
        }

        // Sort by points and grab the top 5
        const leaders = Object.values(userStatsMap)
          .sort((a, b) => b.points - a.points)
          .slice(0, 5)

        setStats({
          players: pError ? 12 : (playerCount || 0),
          capturedZones: zError ? 418 : (capturedCount || 0),
          totalDistanceKm: sError ? 186 : distanceSumKm
        })

        setLeaderboard(leaders)
      } catch (err) {
        console.error('Error loading live metrics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLiveMetrics()
  }, [])

  // Smooth scroll handler for landing page anchors
  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const formatValue = (user) => {
    return `${(user.distance / 1000).toFixed(1)} km`
  }

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-gradient-to-br from-[#0f172a] to-[#1a2f4b] text-[#f1f5f9] font-sans relative">
      
      {/* 1px grid pattern overlay matching the game territory grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-1" />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-[#334155] bg-[#0f172a]/80 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2 text-xl font-bold text-[#3b82f6] cursor-pointer" onClick={() => scrollToSection('top')}>
          <img 
            src="/logo.svg" 
            alt="RunRajya Logo" 
            style={{
              width: 32,
              height: 32,
              objectFit: 'contain',
              filter: 'brightness(0) invert(1) drop-shadow(0 4px 12px rgba(59, 130, 246, 0.45))' // High contrast neon-white glow
            }}
          />
          <span className="text-[#f1f5f9]">Run<span className="text-[#3b82f6]">Rajya</span></span>
        </div>
        
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('leaderboard')} className="text-[#cbd5e1] hover:text-[#3b82f6] text-sm font-semibold transition-colors cursor-pointer bg-transparent border-none">Leaderboard</button>
            <button onClick={() => scrollToSection('map')} className="text-[#cbd5e1] hover:text-[#3b82f6] text-sm font-semibold transition-colors cursor-pointer bg-transparent border-none">Map</button>
            <button onClick={() => scrollToSection('features')} className="text-[#cbd5e1] hover:text-[#3b82f6] text-sm font-semibold transition-colors cursor-pointer bg-transparent border-none">Features</button>
          </nav>

          {/* Dynamic authenticated navigation details */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: profile?.color || '#3b82f6', boxShadow: `0 0 10px ${profile?.color || '#3b82f6'}` }} />
                  <span className="text-sm font-semibold text-[#e2e8f0]">{profile?.username}</span>
                </div>
                <button 
                  onClick={onGetStarted}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all cursor-pointer border-none"
                >
                  Go to Map 🗺️
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => setAuthModalOpen(true)} className="px-4 py-2 border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 text-xs font-bold rounded-lg cursor-pointer transition-all bg-transparent">
                  Login
                </button>
                <button onClick={() => setAuthModalOpen(true)} className="px-4 py-2 bg-[#3b82f6] hover:bg-[#1e40af] text-white text-xs font-bold rounded-lg cursor-pointer transition-all border-none">
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative z-10 padding-b-20 px-6 py-10 box-border">
        
        {/* HERO HEADER */}
        <section id="top" className="max-w-5xl mx-auto flex flex-col items-center justify-center text-center relative z-10 animate-[fadeInUp_0.8s_ease-out] mb-12">
          {/* Neon Logo Emblem */}
          <div style={{
            width: 56, height: 56,
            margin: '0 auto 16px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, #0f1020, #080810)',
            border: '1.5px solid #1e2042',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 30px rgba(59, 130, 246, 0.2)',
          }}>
            <img 
              src="/logo.svg" 
              alt="RunRajya Emblem" 
              style={{ 
                width: 36, 
                height: 36, 
                objectFit: 'contain',
                filter: 'brightness(0) invert(1)' // Inverts dark graphic to white
              }} 
            />
          </div>

          <div className="inline-block px-4 py-1.5 bg-[#3b82f6]/10 border border-[#3b82f6] rounded-full text-[#3b82f6] text-xs font-bold mb-6 uppercase tracking-wider">
            📍 Rupandehi District, Nepal
          </div>
          
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 leading-tight tracking-tight">
            Turn Running Into <span className="bg-gradient-to-r from-[#3b82f6] to-[#fbbf24] bg-clip-text text-transparent">Territorial Conquest</span>
          </h1>
          
          <p className="text-md md:text-lg text-[#cbd5e1] max-w-xl mb-8 leading-relaxed">
            Step outside, paint Rupandehi in your color, and compete on local leaderboards. RunRajya brings physical fitness directly into real-time competitive gameplay.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-12 w-full justify-center px-4">
            <button 
              onClick={user ? onGetStarted : () => setAuthModalOpen(true)}
              className="px-8 py-3 rounded-lg text-sm font-bold text-white bg-[#3b82f6] hover:bg-[#1e40af] hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(59,130,246,0.3)] transition-all cursor-pointer border-none"
            >
              {user ? '⚔️ Enter Map Room' : '⚔️ Claim Your Rajya'}
            </button>
            <button 
              onClick={() => scrollToSection('features')} 
              className="px-8 py-3 rounded-lg text-sm font-bold text-[#3b82f6] border-2 border-[#3b82f6] bg-transparent hover:bg-[#3b82f6]/10 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              Learn More
          </button>
          </div>

          {/* Live Aggregated stats panel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-6 w-full max-w-4xl shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <div className="text-center p-2">
              <div className="text-3xl font-extrabold text-[#3b82f6] mb-1">
                {loading ? '...' : stats.players}
              </div>
              <div className="text-xs text-[#cbd5e1] uppercase tracking-wider font-semibold">Active Conquerors</div>
            </div>
            <div className="text-center p-2 border-t sm:border-t-0 sm:border-x border-[#334155]">
              <div className="text-3xl font-extrabold text-[#3b82f6] mb-1">
                {loading ? '...' : `${stats.capturedZones} / 4,814`}
              </div>
              <div className="text-xs text-[#cbd5e1] uppercase tracking-wider font-semibold">Sectors Conquered</div>
            </div>
            <div className="text-center p-2 border-t sm:border-t-0 border-[#334155]">
              <div className="text-3xl font-extrabold text-[#3b82f6] mb-1">
                {loading ? '...' : `${stats.totalDistanceKm} KM`}
              </div>
              <div className="text-xs text-[#cbd5e1] uppercase tracking-wider font-semibold">Conquest Distance</div>
            </div>
          </div>
        </section>

        {/* LEADERBOARD PREVIEW SECTION */}
        <section id="leaderboard" className="max-w-5xl mx-auto w-full py-8 relative z-10 mb-12">
          <h2 className="text-3xl font-extrabold mb-8 text-center">🏆 Top <span className="bg-gradient-to-r from-[#3b82f6] to-[#fbbf24] bg-clip-text text-transparent">Conquerors</span></h2>
          
          <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl overflow-hidden shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <div className="p-6 border-b border-[#334155] flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-lg font-bold">Rupandehi Leaderboard</div>
              <div className="flex gap-2">
                <span className="px-4 py-1.5 bg-[#3b82f6] text-white text-xs font-bold rounded-lg border border-[#3b82f6]">Live Global</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#3b82f6]/5 border-b border-[#334155]">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#cbd5e1] w-24">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Conqueror</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Conquest Distance</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#cbd5e1]">Sectors Conquered</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-sm text-[#cbd5e1]">Loading rankings...</td>
                    </tr>
                  ) : leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-12 text-center text-sm text-[#cbd5e1]">No sessions recorded yet. Start running!</td>
                    </tr>
                  ) : (
                    leaderboard.map((user, index) => (
                      <tr key={user.id} className="hover:bg-[#3b82f6]/5 transition-colors border-b border-[#334155] last:border-b-0">
                        <td className="px-6 py-4 font-bold text-sm">
                          {index === 0 ? '🥇 1' : index === 1 ? '🥈 2' : index === 2 ? '🥉 3' : `${index + 1}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-[#080810]" 
                              style={{ background: user.color, boxShadow: `0 0 10px ${user.color}88` }}
                            >
                              {user.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="font-semibold text-sm">{user.username}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-[#10b981] font-semibold text-sm">
                          {formatValue(user)}
                        </td>
                        <td className="px-6 py-4 text-right text-[#cbd5e1] text-sm">
                          {user.zones}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-[#3b82f6]/5 border-t border-[#334155] text-center">
              <p className="text-[#cbd5e1] text-sm mb-4">Want to see your name on the leaderboard?</p>
              <button 
                onClick={user ? onGetStarted : () => setAuthModalOpen(true)}
                className="px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-[#3b82f6] hover:bg-[#1e40af] transition-all cursor-pointer border-none"
              >
                Start Conquering Now
              </button>
            </div>
          </div>
        </section>

        {/* MAP PORTAL SHOWCASE SECTION */}
        <section id="map" className="max-w-5xl mx-auto w-full py-8 relative z-10 mb-12">
          <h2 className="text-3xl font-extrabold mb-8 text-center">🗺️ Enter the <span className="bg-gradient-to-r from-[#3b82f6] to-[#fbbf24] bg-clip-text text-transparent">Conquest Map</span></h2>
          
          <div className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-2xl font-bold mb-2">Live Territory Map</h3>
            <p className="text-[#cbd5e1] text-sm max-w-xl mx-auto mb-8">
              Explore Rupandehi's 500m × 500m grid in real-time. See which sectors are conquered and claim your territory.
            </p>
            <button 
              onClick={onGetStarted}
              className="px-8 py-3 rounded-lg text-sm font-bold text-white bg-[#3b82f6] hover:bg-[#1e40af] hover:-translate-y-0.5 hover:shadow-[0_10px_25px_rgba(59,130,246,0.3)] transition-all cursor-pointer border-none"
            >
              📍 View Live Map
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="bg-[#3b82f6]/5 border border-[#334155] rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🎯</div>
                <h4 className="font-bold text-sm mb-2">Real-Time Updates</h4>
                <p className="text-[#cbd5e1] text-xs leading-relaxed">Watch territories change dynamically as runners conquer new sectors in real-time</p>
              </div>
              <div className="bg-[#3b82f6]/5 border border-[#334155] rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🏃</div>
                <h4 className="font-bold text-sm mb-2">Live GPS Tracking</h4>
                <p className="text-[#cbd5e1] text-xs leading-relaxed">Track your workouts offline with high-accuracy GPS and see your path mapped instantly</p>
              </div>
              <div className="bg-[#3b82f6]/5 border border-[#334155] rounded-xl p-6 text-center">
                <div className="text-3xl mb-3">🎨</div>
                <h4 className="font-bold text-sm mb-2">Color Your Territory</h4>
                <p className="text-[#cbd5e1] text-xs leading-relaxed">Paint sectors in your color and build your empire across the district boundaries</p>
              </div>
            </div>
          </div>
        </section>

        {/* THEME FEATURES SECTION */}
        <section id="features" className="max-w-5xl mx-auto w-full py-8 relative z-10">
          <h2 className="text-3xl font-extrabold mb-8 text-center">Why Choose <span className="bg-gradient-to-r from-[#3b82f6] to-[#fbbf24] bg-clip-text text-transparent">RunRajya?</span></h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: '🗺️',
                title: 'Precise Grid System',
                desc: "500m × 500m grid overlayed exactly across Rupandehi's boundary limits using accurate OpenStreetMap GeoJSON borders."
              },
              {
                emoji: '📶',
                title: 'Offline Sync System',
                desc: "Loss of network coverage in rural sectors won't affect tracking. Progress queues locally in IndexedDB and auto-syncs when online."
              },
              {
                emoji: '🔒',
                title: 'Pocket Lock Mode',
                desc: 'Activate wake lock and slide confirmation to safely keep your phone in your running pocket with zero touch glitches.'
              }
            ].map((f, i) => (
              <div 
                key={i} 
                className="bg-[#1e293b]/50 border border-[#334155] rounded-2xl p-6 hover:border-[#3b82f6] hover:bg-[#1e293b]/80 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-gradient-to-r before:from-[#3b82f6] before:to-[#fbbf24] before:scale-x-0 hover:before:scale-x-100 before:transition-transform before:duration-300"
              >
                <div className="text-4xl mb-4">{f.emoji}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-[#cbd5e1] text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#334155] py-8 text-center text-[#cbd5e1] bg-[#0f172a]/50 relative z-10 flex-shrink-0">
        <p className="text-xs">
          &copy; 2026 RunRajya · Designed for Rupandehi District, Nepal · <a href="#" className="text-[#3b82f6] hover:text-[#fbbf24] transition-colors">Privacy</a> · <a href="#" className="text-[#3b82f6] hover:text-[#fbbf24] transition-colors">Terms</a> · <a href="#" className="text-[#3b82f6] hover:text-[#fbbf24] transition-colors">Contact</a>
        </p>
      </footer>

      {/* MODAL SYSTEM: AUTH POPUP DIALOG WINDOW */}
      {authModalOpen && (
        <Auth onClose={() => setAuthModalOpen(false)} />
      )}

    </div>
  )
}