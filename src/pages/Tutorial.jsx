import { useState } from 'react'
import { GameButton, GameCard } from '../components/GameUI'

export default function Tutorial({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = [
    {
      title: 'Welcome to RunRajya!',
      icon: '🎮',
      description: 'Turn your city into a game. Explore neighborhoods, capture zones, and compete with players worldwide.',
      tips: [
        '📍 Use your GPS to explore real-world locations',
        '🏁 Capture zones to earn points and climb the leaderboard',
        '🏆 Compete with friends and players globally'
      ]
    },
    {
      title: 'The Dashboard',
      icon: '📊',
      description: 'Your personal hub where you can see all your stats, recent sessions, and quick actions.',
      tips: [
        '⭐ Track your total points and distances',
        '🎮 View your session history',
        '⚡ Launch activities quickly'
      ]
    },
    {
      title: 'Explore the Map',
      icon: '🗺️',
      description: 'The map shows zones around you. Get close to a zone and capture it for points.',
      tips: [
        '🎯 Walk or run to zones to capture them',
        '👀 Uncovered zones are hidden until you get close',
        '💪 Each capture gives you points based on distance'
      ]
    },
    {
      title: 'Check the Leaderboard',
      icon: '🏆',
      description: 'See how you stack up against other players. Compete for the top spot!',
      tips: [
        '🥇 Rank based on total points earned',
        '🌍 Global rankings from players worldwide',
        '👥 Follow friends and see their progress'
      ]
    },
    {
      title: 'Your Profile',
      icon: '👤',
      description: 'Customize your profile, view your achievements, and track your personal records.',
      tips: [
        '🎨 Choose your player color',
        '📈 View detailed statistics',
        '🏅 Unlock badges and achievements'
      ]
    }
  ]

  const step = steps[currentStep]

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 500,
        background: 'rgba(17, 24, 39, 0.8)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: 20,
        padding: 40,
        backdropFilter: 'blur(10px)',
        textAlign: 'center'
      }}>
        {/* Progress */}
        <div style={{
          marginBottom: 32,
          display: 'flex',
          justifyContent: 'center',
          gap: 8
        }}>
          {steps.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: idx <= currentStep ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Icon */}
        <div style={{
          fontSize: 64,
          marginBottom: 24
        }}>
          {step.icon}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 28,
          fontWeight: 900,
          color: 'white',
          marginBottom: 16,
          letterSpacing: '-0.02em'
        }}>
          {step.title}
        </h2>

        {/* Description */}
        <p style={{
          fontSize: 14,
          color: '#9ca3af',
          marginBottom: 32,
          lineHeight: 1.6
        }}>
          {step.description}
        </p>

        {/* Tips */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 32,
          textAlign: 'left'
        }}>
          <p style={{
            fontSize: 12,
            color: '#3b82f6',
            fontWeight: 700,
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: 0.5
          }}>
            💡 Quick Tips
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            {step.tips.map((tip, idx) => (
              <div
                key={idx}
                style={{
                  fontSize: 13,
                  color: '#9ca3af'
                }}
              >
                {tip}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center'
        }}>
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#9ca3af',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)'
                e.target.style.color = 'white'
              }}
              onMouseLeave={e => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                e.target.style.color = '#9ca3af'
              }}
            >
              ← Back
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
                flex: currentStep === 0 ? 1 : 'auto'
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.5)'
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)'
              }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={onComplete}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #2ed573, #20b75f)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 10px 30px rgba(46, 213, 115, 0.3)',
                flex: 1
              }}
              onMouseEnter={e => {
                e.target.style.transform = 'translateY(-2px)'
                e.target.style.boxShadow = '0 15px 40px rgba(46, 213, 115, 0.5)'
              }}
              onMouseLeave={e => {
                e.target.style.transform = 'translateY(0)'
                e.target.style.boxShadow = '0 10px 30px rgba(46, 213, 115, 0.3)'
              }}
            >
              Let's Play! 🚀
            </button>
          )}
        </div>

        {/* Skip button */}
        <button
          onClick={onComplete}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'color 0.3s ease'
          }}
          onMouseEnter={e => e.target.style.color = '#9ca3af'}
          onMouseLeave={e => e.target.style.color = '#6b7280'}
        >
          Skip tutorial
        </button>
      </div>
    </div>
  )
}
