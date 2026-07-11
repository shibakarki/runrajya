import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonLeaderboard } from '../components/Skeleton'

export default function Leaderboard({ sidebar = false }) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [leaderboard, setLeaderboard] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('points') // 'points' | 'distance' | 'zones'

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  // Aggregate session statistics dynamically on top of profile entries
  async function fetchLeaderboardData() {
    setLoading(true)
    try {
      // 1. Fetch profiles
      const { data: profileList, error: pError } = await supabase
        .from('profiles')
        .select('*')

      if (pError) throw pError

      // 2. Fetch session statistics
      const { data: sessionList, error: sError } = await supabase
        .from('sessions')
        .select('user_id, points, distance_m, zones_captured')

      if (sError) throw sError

      // 3. Map aggregates onto user object keys
      const userStatsMap = {}
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

      if (sessionList) {
        sessionList.forEach(s => {
          if (userStatsMap[s.user_id]) {
            userStatsMap[s.user_id].points += (s.points || 0)
            userStatsMap[s.user_id].distance += (s.distance_m || 0)
            userStatsMap[s.user_id].zones += (s.zones_captured || 0)
          }
        })
      }

      setLeaderboard(Object.values(userStatsMap))
    } catch (err) {
      console.error('Failed to load leaderboard metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort computed records
  const processedLeaders = useMemo(() => {
    let list = [...leaderboard]

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(u => u.username.toLowerCase().includes(q))
    }

    // Dynamic sort algorithm
    return list.sort((a, b) => {
      if (sortBy === 'distance') return b.distance - a.distance
      if (sortBy === 'zones') return b.zones - a.zones
      return b.points - a.points // default points
    })
  }, [leaderboard, searchQuery, sortBy])

  // Extract Top 3 for the visual podium
  const topThree = useMemo(() => {
    return processedLeaders.slice(0, 3)
  }, [processedLeaders])

  // Extract Rank 4 and below
  const listLeaders = useMemo(() => {
    return processedLeaders.slice(3)
  }, [processedLeaders])

  if (loading) {
    return (
      <div style={{ height: '100%', background: '#080810', padding: 16 }}>
        {/* Render your loading skeleton card */}
        <div style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 40 }}>Loading Conquest Rankings...</div>
      </div>
    )
  }

  const formatValue = (user, type) => {
    if (type === 'distance') return `${Math.round(user.distance)}m`
    if (type === 'zones') return `${user.zones} zones`
    return `${user.points} pts`
  }

  return (
    <div style={{
      height: '100%',
      background: '#080810',
      overflowY: 'auto',
      padding: '16px 16px 80px 16px', // Extra bottom spacing keeps content above tabs
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxSizing: 'border-box'
    }}>

      {/* Header — Full Screen view only */}
      {!sidebar && (
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h1 style={{ color: 'white', fontSize: 16, fontWeight: 800, margin: 0 }}>🏆 Conquest Rankings</h1>
          <p style={{ color: '#64748b', fontSize: 11, margin: '4px 0 0 0' }}>Rupandehi District Real-Time Standings</p>
        </div>
      )}

      {/* Sorting Tabs Selector */}
      <div style={{
        display: 'flex',
        background: '#0f1020',
        padding: 3,
        borderRadius: 12,
        border: '1px solid #1e2042',
        gap: 2,
        flexShrink: 0
      }}>
        {[
          { key: 'points', label: 'Points' },
          { key: 'distance', label: 'Distance' },
          { key: 'zones', label: 'Zones' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setSortBy(tab.key)}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              background: sortBy === tab.key ? 'linear-gradient(135deg, #3b82f6, #1e40af)' : 'transparent',
              color: sortBy === tab.key ? 'white' : '#64748b',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input — Secured at 16px baseline to prevent mobile input zoom */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search conqueror..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            background: '#0f1020',
            border: '1px solid #1e2042',
            borderRadius: 12,
            padding: '12px 14px',
            color: '#e2e8f0',
            fontSize: '16px', // Guard: prevents mobile safari scale shifts
            outline: 'none',
            width: '100%',
            boxSizing: 'border-box'
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* 3D VISUAL PODIUM (Rendered only on Full-Screen mode and if Top 3 are available) */}
      {!sidebar && topThree.length > 0 && !searchQuery && (
        <div style={{
          background: 'rgba(15, 16, 32, 0.4)',
          border: '1px solid #1e2042',
          borderRadius: 20,
          padding: '24px 12px 16px 12px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          height: 180,
          gap: 10,
          margin: '10px 0',
          flexShrink: 0
        }}>
          
          {/* Rank 2 (Left) */}
          {topThree[1] && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `2px solid ${topThree[1].color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#0f1020', color: 'white', fontWeight: 800, fontSize: 14
                }}>
                  {topThree[1].username?.[0]?.toUpperCase()}
                </div>
                <div style={podiumBadgeStyle('#94a3b8')}>2</div>
              </div>
              <span style={podiumNameStyle}>{topThree[1].username}</span>
              <span style={podiumScoreStyle}>{formatValue(topThree[1], sortBy)}</span>
              <div style={podiumPillarStyle(50, '#1e2042')} />
            </div>
          )}

          {/* Rank 1 (Center - Elevated with Neon Glow) */}
          {topThree[0] && (
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-8px)' }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  border: `2.5px solid ${topThree[0].color}`,
                  boxShadow: `0 0 15px ${topThree[0].color}77`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#0f1020', color: 'white', fontWeight: 800, fontSize: 18
                }}>
                  👑
                </div>
                <div style={podiumBadgeStyle('#fbbf24')}>1</div>
              </div>
              <span style={{ ...podiumNameStyle, fontWeight: 800, color: 'white' }}>{topThree[0].username}</span>
              <span style={{ ...podiumScoreStyle, color: topThree[0].color }}>{formatValue(topThree[0], sortBy)}</span>
              <div style={podiumPillarStyle(70, 'linear-gradient(135deg, #1e2042, #3b82f633)')} />
            </div>
          )}

          {/* Rank 3 (Right) */}
          {topThree[2] && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  border: `2px solid ${topThree[2].color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#0f1020', color: 'white', fontWeight: 800, fontSize: 14
                }}>
                  {topThree[2].username?.[0]?.toUpperCase()}
                </div>
                <div style={podiumBadgeStyle('#b45309')}>3</div>
              </div>
              <span style={podiumNameStyle}>{topThree[2].username}</span>
              <span style={podiumScoreStyle}>{formatValue(topThree[2], sortBy)}</span>
              <div style={podiumPillarStyle(38, '#1e2042')} />
            </div>
          )}

        </div>
      )}

      {/* REMAINING RANKINGS LIST */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {/* Render Podium users inside a compact list if sidebar mode or search query is active */}
        {(sidebar || searchQuery ? processedLeaders : listLeaders).map((user, i) => {
          const rank = sidebar || searchQuery ? i + 1 : i + 4
          const isMe = user.id === profile?.id
          
          return (
            <div
              key={user.id}
              style={{
                background: isMe ? 'rgba(59, 130, 246, 0.08)' : '#0f1020',
                border: isMe ? '1.5px solid #2563eb' : '1px solid #1e2042',
                borderRadius: 14,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: isMe ? '0 4px 16px rgba(37, 99, 235, 0.15)' : 'none',
              }}
            >
              {/* Rank Index */}
              <div style={{
                width: 24,
                fontSize: 12,
                fontWeight: 800,
                color: rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : '#475569',
                textAlign: 'center'
              }}>
                #{rank}
              </div>

              {/* Faction color bubble */}
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: user.color,
                boxShadow: `0 0 10px ${user.color}`,
                flexShrink: 0
              }} />

              {/* Username + Faction Badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    color: isMe ? '#ffffff' : '#e2e8f0',
                    fontSize: 13,
                    fontWeight: isMe ? 800 : 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {user.username}
                  </span>
                  {user.team === 'solo' ? (
                    <span style={factionBadgeStyle('#475569', 'rgba(71, 85, 105, 0.15)')}>Solo</span>
                  ) : (
                    <span style={factionBadgeStyle(user.color, `${user.color}15`)}>Team</span>
                  )}
                </div>
              </div>

              {/* Stat Value */}
              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: isMe ? '#ffffff' : '#94a3b8',
                textAlign: 'right'
              }}>
                {formatValue(user, sortBy)}
              </div>
            </div>
          )
        })}

        {processedLeaders.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
            No conquerors found matching your search.
          </div>
        )}
      </div>

    </div>
  )
}

// Inline Podium CSS Variables
const podiumNameStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: '#94a3b8',
  maxWidth: 70,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  textAlign: 'center'
}

const podiumScoreStyle = {
  fontSize: 11,
  fontWeight: 800,
  color: '#e2e8f0',
  marginTop: 2
}

const podiumBadgeStyle = (bgColor) => ({
  position: 'absolute',
  bottom: -4,
  right: -2,
  width: 16,
  height: 16,
  borderRadius: '50%',
  background: bgColor,
  color: '#080810',
  fontSize: 9,
  fontWeight: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
})

const podiumPillarStyle = (height, background) => ({
  width: '100%',
  height: height,
  background: background,
  borderRadius: '8px 8px 0 0',
  marginTop: 'auto',
  border: '1.5px solid #1e2042',
  borderBottom: 'none'
})

const factionBadgeStyle = (color, bg) => ({
  fontSize: 8,
  fontWeight: 800,
  color: color,
  background: bg,
  border: `1px solid ${color}33`,
  borderRadius: 4,
  padding: '1px 4px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
})