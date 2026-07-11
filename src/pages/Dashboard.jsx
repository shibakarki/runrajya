import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { PageLayout } from '../components/GameUI'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({ points: 0, distance: 0, zones: 0, sessions: 0 })
  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) fetchDashboardData()
  }, [profile])

  async function fetchDashboardData() {
    try {
      // Get sessions
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('started_at', { ascending: false })
        .limit(5)

      if (sessionData) {
        const totalPoints = sessionData.reduce((s, x) => s + (x.points || 0), 0)
        const totalDistance = sessionData.reduce((s, x) => s + (x.distance_m || 0), 0)
        setStats(prev => ({
          ...prev,
          points: totalPoints,
          distance: totalDistance,
          sessions: sessionData.length
        }))
        setRecentActivity(sessionData)
      }

      // Get zone count
      const { count: zoneCount } = await supabase
        .from('zones')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', profile.id)

      setStats(prev => ({ ...prev, zones: zoneCount || 0 }))
    } finally {
      setLoading(false)
    }
  }

  const formatDistance = (m) => {
    if (m >= 1000) return (m / 1000).toFixed(1) + ' km'
    return m.toFixed(0) + ' m'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{
        height: '100%',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280'
      }}>
        Loading dashboard...
      </div>
    )
  }

  return (
    <PageLayout title="📊 Dashboard" padding={true}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.05) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: 16,
        padding: 24,
        backdropFilter: 'blur(10px)',
        marginBottom: 16
      }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 800,
          color: 'white',
          marginBottom: 8
        }}>
          Welcome back, {profile?.username}!
        </h2>
        <p style={{
          fontSize: 14,
          color: '#9ca3af'
        }}>
          Here's your game overview. Ready to capture more zones?
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 12
      }}>
        {[
          { label: 'Total Points', value: stats.points.toLocaleString(), icon: '⭐' },
          { label: 'Distance', value: formatDistance(stats.distance), icon: '📍' },
          { label: 'Zones Owned', value: stats.zones, icon: '🏁' },
          { label: 'Sessions', value: stats.sessions, icon: '🎮' }
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 12,
              padding: 16,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{stat.icon}</div>
            <div style={{
              fontSize: 12,
              color: '#9ca3af',
              marginBottom: 4
            }}>
              {stat.label}
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#3b82f6'
            }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'white',
          marginBottom: 12
        }}>
          Quick Actions
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10
        }}>
          {[
            { label: 'Start Session', icon: '▶️' },
            { label: 'View Map', icon: '🗺️' },
            { label: 'Leaderboard', icon: '🏆' },
            { label: 'Settings', icon: '⚙️' }
          ].map((action, idx) => (
            <button
              key={idx}
              style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 8,
                padding: 12,
                color: 'white',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.2)'
              }}
            >
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(10px)'
      }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 700,
          color: 'white',
          marginBottom: 12
        }}>
          Recent Sessions
        </h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          maxHeight: 300,
          overflowY: 'auto'
        }}>
          {recentActivity.length > 0 ? (
            recentActivity.map((session, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: 8,
                  padding: 12,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12,
                  borderLeft: `3px solid ${profile?.color || '#3b82f6'}`
                }}
              >
                <div>
                  <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>
                    📍 {session.points || 0} points
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: 11 }}>
                    {formatDistance(session.distance_m || 0)} • {formatDate(session.started_at)}
                  </div>
                </div>
                <div style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: '#3b82f6',
                  padding: '4px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  +{session.zones_captured || 0}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#6b7280',
              padding: '20px 0',
              fontSize: 12
            }}>
              No sessions yet. Start your first game!
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
