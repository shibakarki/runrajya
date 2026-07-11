import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonProfile } from '../components/Skeleton'

const FACTION_COLORS = [
  { name: 'Team Crimson', hex: '#ff4757', desc: 'Conquer with fire and raw energy' },
  { name: 'Team Emerald', hex: '#2ed573', desc: 'Secure territory with steady endurance' },
  { name: 'Team Azure', hex: '#1e90ff', desc: 'Dominate strategic sectors like water' },
  { name: 'Team Amber', hex: '#ffa502', desc: 'Claim zones with vibrant tactical speed' },
  { name: 'Team Royal', hex: '#a29bfe', desc: 'Rule the grid with calculated discipline' },
  { name: 'Solo Explorer', hex: '#cbd5e1', desc: 'Claim territory under your own neutral faction' }
]

export default function Profile({ sidebar = false }) {
  const { profile, user, signOut } = useAuth()
  const [stats, setStats] = useState({ points: 0, distance: 0, zones: 0, sessions: 0 })
  const [ownedZones, setOwnedZones] = useState(0)
  const [totalZones, setTotalZones] = useState(0)
  const [sessions, setSessions] = useState([])
  const [username, setUsername] = useState('')
  const [color, setColor] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username)
      setColor(profile.color)
      fetchStats()
    }
  }, [profile])

  async function fetchStats() {
    // 1. Get sessions
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', profile.id)
      .order('started_at', { ascending: false })

    if (sessionData) {
      setSessions(sessionData)
      setStats({
        points: sessionData.reduce((s, x) => s + (x.points || 0), 0),
        distance: sessionData.reduce((s, x) => s + (x.distance_m || 0), 0),
        sessions: sessionData.length,
        zones: 0, // Querying database live for accuracy below
      })
    }

    // 2. Get accurate zone count directly from zones table
    const { count: ownedCount } = await supabase
      .from('zones')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', profile.id)

    // 3. Get total zone count in Rupandehi grid
    const { count: totalCount } = await supabase
      .from('zones')
      .select('*', { count: 'exact', head: true })

    setOwnedZones(ownedCount || 0)
    setTotalZones(totalCount || 0)
    setStats(prev => ({ ...prev, zones: ownedCount || 0 }))
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    
    // Automatically match team database field to edited color selection
    const matchedFaction = FACTION_COLORS.find(f => f.hex === color)
    const teamValue = matchedFaction?.hex === '#cbd5e1' ? 'solo' : (matchedFaction?.name || 'solo')

    await supabase
      .from('profiles')
      .update({ 
        username, 
        color,
        team: teamValue
      })
      .eq('id', profile.id)
      
    setSaving(false)
    setEditing(false)
  }

  if (loading) return <SkeletonProfile />

  const getTeamNameDisplay = () => {
    if (!profile?.team || profile.team === 'solo') return 'Solo Explorer'
    return profile.team
  }

  return (
    <div style={{
      height: '100%',
      background: '#080810',
      overflowY: 'auto',
      padding: '16px 16px 80px 16px', // Prevents footer navigation from overlapping content
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      boxSizing: 'border-box'
    }}>

      {/* Header — full screen view only */}
      {!sidebar && (
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <h1 style={{ color: 'white', fontSize: 16, fontWeight: 800, margin: 0 }}>👤 Conqueror Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: 11, margin: '4px 0 0 0' }}>Conquest Analytics & Customization</p>
        </div>
      )}

      {/* IDENTITY PROFILE CARD */}
      <div style={{
        background: '#0f1020',
        border: `1.5px solid ${profile?.color}22`,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 15px ${profile?.color}05`,
        borderRadius: 16,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: editing ? 14 : 0 }}>
          
          {/* Neon Team Avatar */}
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: color || profile?.color,
            boxShadow: `0 0 12px ${color || profile?.color}77`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 900,
            color: '#080810',
            flexShrink: 0,
            border: '2px solid white'
          }}>
            {profile?.username?.[0]?.toUpperCase()}
          </div>

          {/* User metadata */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  background: '#14152a',
                  border: '1px solid #1e2042',
                  borderRadius: 8,
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '16px', // Prevents iOS mobile viewport scale shift
                  fontWeight: 600,
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'white', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile?.username}
                  </span>
                  <span style={factionBadgeStyle(profile?.color || '#cbd5e1')}>
                    {getTeamNameDisplay()}
                  </span>
                </div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{user?.email}</div>
              </div>
            )}
          </div>

          {/* Action toggle */}
          <button
            onClick={() => editing ? saveProfile() : setEditing(true)}
            style={{
              background: editing ? '#2563eb' : '#14152a',
              color: editing ? 'white' : '#94a3b8',
              border: editing ? 'none' : '1px solid #1e2042',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: editing ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none'
            }}
          >
            {saving ? '...' : editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {/* Faction Customizer (Edit mode only) */}
        {editing && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2042' }}>
            <p style={{
              color: '#64748b',
              fontSize: 10,
              fontWeight: 700,
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Choose Your Faction Align Color
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {FACTION_COLORS.map(f => (
                <div
                  key={f.hex}
                  onClick={() => setColor(f.hex)}
                  style={{
                    width: 28,
                    height: 24,
                    borderRadius: 6,
                    background: f.hex,
                    cursor: 'pointer',
                    border: color === f.hex ? '2.5px solid white' : '1px solid rgba(0,0,0,0.3)',
                    flexShrink: 0,
                    transform: color === f.hex ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: color === f.hex ? `0 0 10px ${f.hex}` : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={f.name}
                />
              ))}
            </div>
            
            {/* Dynamic Customizer Explanation Label */}
            <div style={{ background: '#14152a', padding: 10, borderRadius: 8, border: '1px solid #1e2042' }}>
              <p style={{ color: color, fontSize: 11, fontWeight: 800, margin: '0 0 2px 0' }}>
                {FACTION_COLORS.find(f => f.hex === color)?.name || 'Custom Faction'}
              </p>
              <p style={{ color: '#64748b', fontSize: 9, margin: 0, lineHeight: '1.4' }}>
                {FACTION_COLORS.find(f => f.hex === color)?.desc || ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CORE STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Points', value: stats.points, color: profile?.color || '#3b82f6' },
          { label: 'Distance Walked', value: `${Math.round(stats.distance)}m`, color: '#2ed573' },
          { label: 'Zones Conquered', value: stats.zones, color: '#1e90ff' },
          { label: 'Active Sessions', value: stats.sessions, color: '#ffa502' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#0f1020',
            border: '1px solid #1e2042',
            borderRadius: 14,
            padding: '12px 14px',
          }}>
            <div style={{
              color: '#64748b',
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 4,
              fontWeight: 600
            }}>
              {stat.label}
            </div>
            <div style={{ color: stat.color, fontSize: 22, fontWeight: 900 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* DISTRICT TERRITORY CONTROL */}
      <div style={{
        background: '#0f1020',
        border: '1px solid #1e2042',
        borderRadius: 14,
        padding: '12px 14px',
      }}>
        <div style={{
          color: '#64748b',
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 10,
          fontWeight: 600
        }}>
          Territory Control State
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>
            {ownedZones} sectors owned
          </span>
          <span style={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>
            {totalZones > 0 ? ((ownedZones / totalZones) * 100).toFixed(1) : '0'}% of Rupandehi
          </span>
        </div>
        {/* Glow-Animated progress track */}
        <div style={{ height: 6, background: '#14152a', borderRadius: 3, overflow: 'hidden', border: '1px solid #1e2042' }}>
          <div style={{
            height: '100%',
            width: `${totalZones > 0 ? (ownedZones / totalZones) * 100 : 0}%`,
            background: profile?.color,
            boxShadow: `0 0 10px ${profile?.color}`,
            borderRadius: 3,
            transition: 'width 0.5s ease',
            minWidth: ownedZones > 0 ? 4 : 0,
          }} />
        </div>
      </div>

      {/* SESSION HISTORY HISTORY CARD */}
      <div style={{
        background: '#0f1020',
        border: '1px solid #1e2042',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 14px',
          borderBottom: '1px solid #1e2042',
        }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>
            Conquest Log (Last 5 Sessions)
          </span>
        </div>

        {sessions.length === 0 ? (
          <div style={{ padding: 32, color: '#64748b', fontSize: 12, textAlign: 'center' }}>
            No log reports found. Go capture some grids!
          </div>
        ) : sessions.slice(0, 5).map((s, i) => (
          <div
            key={s.id}
            style={{
              padding: '12px 14px',
              borderBottom: i < Math.min(sessions.length, 5) - 1 ? '1px solid #1e2042' : 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>
                {new Date(s.started_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric'
                })}
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                {Math.round(s.distance_m || 0)}m · {s.zones_captured || 0} zones captured
              </div>
            </div>
            <div style={{ color: profile?.color, fontSize: 16, fontWeight: 900 }}>
              +{s.points || 0} pts
            </div>
          </div>
        ))}
      </div>

      {/* MOBILE SIGN OUT BUTTON */}
      {(!sidebar) && (
        <button
          onClick={signOut}
          style={{
            width: '100%',
            padding: 13,
            background: 'transparent',
            border: '1px solid #e11d4833',
            borderRadius: 12,
            color: '#f43f5e',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginTop: 6
          }}
        >
          Disconnect Session
        </button>
      )}

    </div>
  )
}

// Inline badge styling helper
const factionBadgeStyle = (color) => ({
  fontSize: 8,
  fontWeight: 800,
  color: color,
  background: `${color}15`,
  border: `1px solid ${color}33`,
  borderRadius: 4,
  padding: '2px 6px',
  textTransform: 'uppercase',
  letterSpacing: '0.04em'
})