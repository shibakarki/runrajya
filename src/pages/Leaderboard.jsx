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

  // Aggregate stats dynamically, pulling exact current zone ownership
  async function fetchLeaderboardData() {
    setLoading(true)
    try {
      // 1. Fetch profiles
      const { data: profileList, error: pError } = await supabase
        .from('profiles')
        .select('*')

      if (pError) throw pError

      // 2. Fetch session metrics (points and total distance)
      const { data: sessionList, error: sError } = await supabase
        .from('sessions')
        .select('user_id, points, distance_m')

      if (sError) throw sError

      // 3. Fetch exact, live zones currently owned per player directly from the zones table
      const { data: zoneOwnershipList, error: zError } = await supabase
        .from('zones')
        .select('owner_id')
        .not('owner_id', 'is', null)

      if (zError) throw zError

      // Map zone counts
      const zoneCountMap = {}
      zoneOwnershipList.forEach(z => {
        zoneCountMap[z.owner_id] = (zoneCountMap[z.owner_id] || 0) + 1
      })

      // Aggregate final results
      const userStatsMap = {}
      profileList.forEach(p => {
        userStatsMap[p.id] = {
          id: p.id,
          username: p.username,
          color: p.color || '#cbd5e1',
          team: p.team || 'solo',
          points: 0,
          distance: 0,
          zones: zoneCountMap[p.id] || 0 // Current zones owned
        }
      })

      if (sessionList) {
        sessionList.forEach(s => {
          if (userStatsMap[s.user_id]) {
            userStatsMap[s.user_id].points += (s.points || 0)
            userStatsMap[s.user_id].distance += (s.distance_m || 0)
          }
        })
      }

      setLeaderboard(Object.values(userStatsMap))
    } catch (err) {
      console.error('Failed to load leaderboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort
  const processedLeaders = useMemo(() => {
    let list = [...leaderboard]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(u => u.username.toLowerCase().includes(q))
    }

    return list.sort((a, b) => {
      if (sortBy === 'distance') return b.distance - a.distance
      if (sortBy === 'zones') return b.zones - a.zones
      return b.points - a.points
    })
  }, [leaderboard, searchQuery, sortBy])

  if (loading) {
    return <SkeletonLeaderboard />
  }

  const formatValue = (user, type) => {
    if (type === 'distance') return `${(user.distance / 1000).toFixed(1)} km`
    if (type === 'zones') return `${user.zones} owned`
    return `${user.points} pts`
  }

  return (
    <div style={{
      height: '100%',
      background: '#080810',
      overflowY: 'auto',
      padding: '24px 16px 80px 16px', // Extra bottom spacing keeps content above dynamic nav pill
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxSizing: 'border-box'
    }}>

      {/* Header — Full screen view only */}
      {!sidebar && (
        <div style={{ textAlign: 'center', marginBottom: 4, marginTop: 48 }}>
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
          { key: 'zones', label: 'Zones Owned' },
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

      {/* Search Input */}
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
            fontSize: '16px', // Prevents iOS input scale shifts
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

      {/* COMPACT & HIGHLY STYLED VERTICAL-ONLY RANKINGS LIST */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}>
        {processedLeaders.map((user, i) => {
          const rank = i + 1
          const isMe = user.id === profile?.id
          
          // Custom luxurious indicators for the top 3 spots in the vertical list
          const isTop3 = rank <= 3
          const borderGlowColor = rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : 'transparent'
          const badgeIcon = rank === 1 ? '🥇 1st' : rank === 2 ? '🥈 2nd' : rank === 3 ? '🥉 3rd' : `#${rank}`

          return (
            <div
              key={user.id}
              style={{
                background: isMe ? 'rgba(59, 130, 246, 0.08)' : '#0f1020',
                border: isTop3 ? `1.5px solid ${borderGlowColor}` : isMe ? '1.5px solid #2563eb' : '1px solid #1e2042',
                borderRadius: 14,
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                boxShadow: isTop3 
                  ? `0 4px 20px ${borderGlowColor}15, 0 0 10px ${borderGlowColor}08` 
                  : isMe ? '0 4px 16px rgba(37, 99, 235, 0.15)' : 'none',
              }}
            >
              {/* Rank Index / Medals Badge */}
              <div style={{
                width: 48,
                fontSize: 11,
                fontWeight: 900,
                color: rank === 1 ? '#fbbf24' : rank === 2 ? '#cbd5e1' : rank === 3 ? '#b45309' : '#475569',
                textAlign: 'left',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em'
              }}>
                {badgeIcon}
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
                    fontWeight: isMe || isTop3 ? 800 : 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {user.username}
                  </span>
                  
                  {/* Render special Crown for Faction Leader */}
                  {rank === 1 && <span style={{ fontSize: 11, pointerEvents: 'none' }}>👑</span>}

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
                color: rank === 1 ? '#fbbf24' : isMe ? '#ffffff' : '#cbd5e1',
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