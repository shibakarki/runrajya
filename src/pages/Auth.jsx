import { useState } from 'react'
import { supabase } from '../lib/supabase'

const TEAMS = [
  { name: 'Team Crimson', hex: '#ff4757', desc: 'Conquer with fire and raw energy' },
  { name: 'Team Emerald', hex: '#2ed573', desc: 'Secure territory with steady endurance' },
  { name: 'Team Azure', hex: '#1e90ff', desc: 'Dominate strategic sectors like water' },
  { name: 'Team Amber', hex: '#ffa502', desc: 'Claim zones with vibrant tactical speed' },
  { name: 'Team Royal', hex: '#a29bfe', desc: 'Rule the grid with calculated discipline' },
]

const SOLO_COLOR = '#cbd5e1' // Platinum Chrome

export default function Auth({ onClose }) {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  
  // Signup Team Configuration
  const [playMode, setPlayMode] = useState('alone') // 'alone' or 'team'
  const [selectedTeam, setSelectedTeam] = useState(TEAMS[0])
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      // Configure metadata variables based on Solo vs Team selections
      const teamValue = playMode === 'alone' ? 'solo' : selectedTeam.name
      const colorValue = playMode === 'alone' ? SOLO_COLOR : selectedTeam.hex

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { 
            username, 
            color: colorValue, 
            team: teamValue 
          } 
        }
      })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        background: '#0f1020',
        border: '1px solid #1e2042',
        borderRadius: 24,
        padding: 24,
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        position: 'relative',
        maxHeight: '90dvh',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        
        {/* Dismiss Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: '#14152a',
            border: '1px solid #1e2042',
            color: '#64748b',
            borderRadius: '50%',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            {isLogin ? 'Enter RunRajya' : 'Join the Conquest'}
          </h2>
          <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>
            {isLogin ? 'Sign in to access the map' : 'Create an account to start claiming sectors'}
          </p>
        </div>

        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />

          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Conqueror Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={inputStyle}
              />

              {/* Play Mode Selector */}
              <div style={{ margin: '4px 0' }}>
                <p style={labelStyle}>Play Mode</p>
                <div style={{ display: 'flex', background: '#14152a', padding: 3, borderRadius: 10, border: '1px solid #1e2042', gap: 2 }}>
                  <button
                    onClick={() => setPlayMode('alone')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: playMode === 'alone' ? 'linear-gradient(135deg, #3b82f6, #1e40af)' : 'transparent',
                      color: playMode === 'alone' ? 'white' : '#64748b',
                    }}
                  >
                    👤 Play Alone
                  </button>
                  <button
                    onClick={() => setPlayMode('team')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      background: playMode === 'team' ? 'linear-gradient(135deg, #3b82f6, #1e40af)' : 'transparent',
                      color: playMode === 'team' ? 'white' : '#64748b',
                    }}
                  >
                    👥 Faction Team
                  </button>
                </div>
              </div>

              {/* Play Alone State */}
              {playMode === 'alone' && (
                <div style={{ background: '#14152a', padding: 12, borderRadius: 10, border: '1px solid #1e2042', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: SOLO_COLOR, boxShadow: `0 0 10px ${SOLO_COLOR}55` }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: 'white', fontSize: 11, fontWeight: 700, margin: '0 0 2px 0' }}>Solo Explorer Color (Platinum Chrome)</p>
                    <p style={{ color: '#64748b', fontSize: 9, margin: 0 }}>You will claim territory under your own neutral platinum faction color.</p>
                  </div>
                </div>
              )}

              {/* Play as Team Selector */}
              {playMode === 'team' && (
                <div>
                  <p style={labelStyle}>Select Faction Team</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                    {TEAMS.map(team => (
                      <button
                        key={team.name}
                        onClick={() => setSelectedTeam(team)}
                        style={{
                          height: 36,
                          borderRadius: 8,
                          background: team.hex,
                          border: selectedTeam.name === team.name ? '2.5px solid white' : '2px solid transparent',
                          cursor: 'pointer',
                          transform: selectedTeam.name === team.name ? 'scale(1.05)' : 'scale(1)',
                          transition: 'transform 0.15s ease',
                          boxShadow: selectedTeam.name === team.name ? `0 4px 12px ${team.hex}66` : 'none',
                        }}
                        title={team.name}
                      />
                    ))}
                  </div>
                  <div style={{ background: '#14152a', padding: 10, borderRadius: 10, border: '1px solid #1e2042', textAlign: 'center' }}>
                    <p style={{ color: selectedTeam.hex, fontSize: 11, fontWeight: 800, margin: '0 0 2px 0' }}>{selectedTeam.name}</p>
                    <p style={{ color: '#64748b', fontSize: 9, margin: 0 }}>{selectedTeam.desc}</p>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '8px 12px',
            }}>
              <p style={{ color: '#fca5a5', fontSize: 11, margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? '#1e2042' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '13px',
              fontSize: 13,
              fontWeight: 800,
              cursor: loading ? 'default' : 'pointer',
              marginTop: 4,
              boxShadow: loading ? 'none' : '0 6px 16px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
          </button>

          <button
            onClick={() => { setIsLogin(!isLogin); setError('') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#64748b', fontSize: 11, marginTop: 4,
              padding: 4,
            }}
          >
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <span style={{ color: '#3b82f6', fontWeight: 600 }}>
              {isLogin ? 'Sign up' : 'Sign in'}
            </span>
          </button>
        </div>

      </div>
    </div>
  )
}

const inputStyle = {
  background: '#14152a',
  border: '1px solid #1e2042',
  borderRadius: 10,
  padding: '12px 14px',
  color: '#e2e8f0',
  fontSize: '16px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle = {
  color: '#64748b',
  fontSize: 10,
  fontWeight: 700,
  marginBottom: 8,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}