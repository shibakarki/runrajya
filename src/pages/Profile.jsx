import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { SkeletonProfile } from '../components/Skeleton'
import Legal from './Legal' // New Component for Contact/Privacy/Terms

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

  // New state for Legal/Contact modals
  const [showLegal, setShowLegal] = useState(null);

  // Interactive toggle to collapse/expand Session History Logs
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username)
      setColor(profile.color)
      fetchStats()
    }
  }, [profile])

  async function fetchStats() {
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
        zones: 0, 
      })
    }

    const { count: ownedCount } = await supabase
      .from('zones')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', profile.id)

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
    const matchedFaction = FACTION_COLORS.find(f => f.hex === color)
    const teamValue = matchedFaction?.hex === '#cbd5e1' ? 'solo' : (matchedFaction?.name || 'solo')

    await supabase
      .from('profiles')
      .update({ username, color, team: teamValue })
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
      padding: '24px 16px 120px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      boxSizing: 'border-box'
    }}>

      {!sidebar && (
        <div style={{ textAlign: 'center', marginBottom: 4, marginTop: 48 }}>
          <h1 style={{ color: 'white', fontSize: 16, fontWeight: 800, margin: 0 }}>👤 Conqueror Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: 11, margin: '4px 0 0 0' }}>Conquest Analytics & Customization</p>
        </div>
      )}

      {/* IDENTITY PROFILE CARD */}
      <div style={{
        background: '#0f1020',
        border: `1.5px solid ${profile?.color}22`,
        borderRadius: 16,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', background: color || profile?.color,
            boxShadow: `0 0 12px ${color || profile?.color}77`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: '#080810', border: '2px solid white'
          }}>
            {profile?.username?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {editing ? (
              <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'white', fontSize: 15, fontWeight: 800 }}>{profile?.username}</span>
                  <span style={factionBadgeStyle(profile?.color || '#cbd5e1')}>{getTeamNameDisplay()}</span>
                </div>
                <div style={{ color: '#64748b', fontSize: 11 }}>{user?.email}</div>
              </div>
            )}
          </div>
          <button onClick={() => editing ? saveProfile() : setEditing(true)} style={editButtonStyle(editing)}>
            {saving ? '...' : editing ? 'Save' : 'Edit'}
          </button>
        </div>

        {editing && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #1e2042' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FACTION_COLORS.map(f => (
                <div key={f.hex} onClick={() => setColor(f.hex)} style={colorCircleStyle(f.hex, color)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CORE STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Points', value: stats.points, color: profile?.color || '#3b82f6' },
          { label: 'Dist (KM)', value: `${(stats.distance / 1000).toFixed(1)}`, color: '#2ed573' },
          { label: 'Zones Owned', value: stats.zones, color: '#1e90ff' },
          { label: 'Sessions', value: stats.sessions, color: '#ffa502' },
        ].map(stat => (
          <div key={stat.label} style={statBoxStyle}>
            <div style={statLabelStyle}>{stat.label}</div>
            <div style={{ color: stat.color, fontSize: 22, fontWeight: 900 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* DISTRICT TERRITORY CONTROL */}
      <div style={statBoxStyle}>
        <div style={statLabelStyle}>Territory Control State</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{ownedZones} sectors</span>
          <span style={{ color: '#64748b', fontSize: 11 }}>{((ownedZones / totalZones) * 100).toFixed(1)}%</span>
        </div>
        <div style={progressBgStyle}>
          <div style={progressFillStyle(ownedZones, totalZones, profile?.color)} />
        </div>
      </div>

      {/* COLLAPSIBLE RUNNING LOG REPORTS */}
      <div style={statBoxStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>Session Logs</span>
          <button onClick={() => setShowHistory(!showHistory)} style={viewLogsButtonStyle}>
            {showHistory ? '✕' : '👁️ View'}
          </button>
        </div>
        {showHistory && (
          <div style={{ marginTop: 12 }}>
            {sessions.slice(0, 5).map((s, i) => (
              <div key={s.id} style={sessionLogRowStyle(i === 0)}>
                <div style={{ color: 'white', fontSize: 11 }}>{new Date(s.started_at).toLocaleDateString()}</div>
                <div style={{ color: profile?.color, fontSize: 13, fontWeight: 900 }}>+{s.points} pts</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* NEW: TACTICAL PROTOCOLS & SUPPORT */}
      <div style={statBoxStyle}>
        <div style={statLabelStyle}>Tactical Protocols</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <button onClick={() => setShowLegal('CONTACT')} style={protocolButtonStyle}>Contact Command <span>→</span></button>
          <button onClick={() => setShowLegal('PRIVACY')} style={protocolButtonStyle}>Privacy Policy <span>→</span></button>
          <button onClick={() => setShowLegal('TERMS')} style={protocolButtonStyle}>Terms of Service <span>→</span></button>
        </div>
      </div>

      {/* LOGOUT */}
      <button onClick={signOut} style={logoutButtonStyle}>Abort & Sign Out</button>

      {/* LEGAL MODAL OVERLAY */}
      {showLegal && <Legal initialTab={showLegal} onClose={() => setShowLegal(null)} />}

    </div>
  )
}

// --- STYLES ---
const inputStyle = { background: '#14152a', border: '1px solid #1e2042', borderRadius: 8, padding: '6px 12px', color: 'white', fontSize: '16px', fontWeight: 600, width: '100%', boxSizing: 'border-box' }
const statBoxStyle = { background: '#0f1020', border: '1px solid #1e2042', borderRadius: 14, padding: '12px 14px' }
const statLabelStyle = { color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 600 }
const editButtonStyle = (editing) => ({ background: editing ? '#2563eb' : '#14152a', color: editing ? 'white' : '#94a3b8', border: editing ? 'none' : '1px solid #1e2042', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' })
const colorCircleStyle = (hex, current) => ({ width: 28, height: 24, borderRadius: 6, background: hex, cursor: 'pointer', border: current === hex ? '2.5px solid white' : '1px solid rgba(0,0,0,0.3)', transition: 'all 0.15s ease' })
const progressBgStyle = { height: 6, background: '#14152a', borderRadius: 3, overflow: 'hidden', border: '1px solid #1e2042' }
const progressFillStyle = (owned, total, color) => ({ height: '100%', width: `${total > 0 ? (owned / total) * 100 : 0}%`, background: color, boxShadow: `0 0 10px ${color}`, borderRadius: 3, transition: 'width 0.5s ease' })
const viewLogsButtonStyle = { background: '#14152a', border: '1px solid #1e2042', borderRadius: 20, padding: '4px 12px', color: '#3b82f6', fontSize: 10, fontWeight: 800, cursor: 'pointer' }
const sessionLogRowStyle = (isFirst) => ({ padding: '8px 0', borderTop: isFirst ? 'none' : '1px solid #1e2042', display: 'flex', justifyContent: 'space-between', alignItems: 'center' })
const protocolButtonStyle = { background: '#14152a', border: '1px solid #1e2042', borderRadius: 10, padding: '12px', color: '#94a3b8', fontSize: 11, fontWeight: 700, textAlign: 'left', display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }
const logoutButtonStyle = { background: 'rgba(220, 38, 38, 0.1)', color: '#ef4444', border: '1px solid rgba(220, 38, 38, 0.2)', borderRadius: 12, padding: '14px', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', marginTop: 12 }
const factionBadgeStyle = (color) => ({ fontSize: 8, fontWeight: 800, color: color, background: `${color}15`, border: `1px solid ${color}33`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase' })