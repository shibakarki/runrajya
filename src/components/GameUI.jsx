// Reusable game UI components

// Page wrapper for consistent structure
export function PageLayout({ children, title = null, sidebar = false, padding = true }) {
  return (
    <div style={{
      height: '100%',
      background: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header — full page only */}
      {!sidebar && title && (
        <div style={{
          background: '#111827',
          borderBottom: '1px solid #1f2937',
          padding: '14px 16px',
          textAlign: 'center',
          flexShrink: 0,
        }}>
          <h1 style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>
            {title}
          </h1>
        </div>
      )}

      {/* Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: padding ? (sidebar ? 12 : 16) : 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {children}
      </div>
    </div>
  )
}

export function GameCard({ children, hoverable = true, ...props }) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        cursor: hoverable ? 'pointer' : 'default',
        ...props.style
      }}
      onMouseEnter={e => {
        if (hoverable) {
          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'
          e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)'
        }
      }}
      onMouseLeave={e => {
        if (hoverable) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
        }
      }}
    >
      {children}
    </div>
  )
}

export function GameStatBox({ label, value, icon, color = '#3b82f6' }) {
  return (
    <div style={{
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
    }}>
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 800,
        color: color
      }}>
        {value}
      </div>
    </div>
  )
}

export function GameButton({ children, variant = 'primary', size = 'md', ...props }) {
  const baseStyle = {
    border: 'none',
    borderRadius: 10,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  }

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: 'white',
      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)'
    },
    secondary: {
      background: 'rgba(59, 130, 246, 0.1)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.3)'
    },
    outline: {
      background: 'transparent',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.5)'
    }
  }

  const sizes = {
    sm: { padding: '8px 16px', fontSize: 12 },
    md: { padding: '12px 24px', fontSize: 14 },
    lg: { padding: '16px 32px', fontSize: 16 }
  }

  return (
    <button
      style={{
        ...baseStyle,
        ...variants[variant],
        ...sizes[size],
        ...props.style
      }}
      onMouseEnter={e => {
        e.target.style.transform = 'translateY(-2px)'
        if (variant === 'primary') {
          e.target.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.5)'
        }
      }}
      onMouseLeave={e => {
        e.target.style.transform = 'translateY(0)'
        if (variant === 'primary') {
          e.target.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.3)'
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, max = 100, showLabel = false, color = '#3b82f6' }) {
  const percentage = (value / max) * 100
  
  return (
    <div>
      <div style={{
        width: '100%',
        height: 8,
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        border: `1px solid rgba(255, 255, 255, 0.05)`
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 0.3s ease',
          boxShadow: `0 0 10px ${color}80`
        }} />
      </div>
      {showLabel && (
        <div style={{
          marginTop: 4,
          fontSize: 12,
          color: '#9ca3af'
        }}>
          {value} / {max}
        </div>
      )}
    </div>
  )
}

export function Badge({ children, variant = 'default', icon = null }) {
  const variants = {
    default: {
      background: 'rgba(59, 130, 246, 0.2)',
      color: '#3b82f6',
      border: '1px solid rgba(59, 130, 246, 0.3)'
    },
    success: {
      background: 'rgba(46, 213, 115, 0.2)',
      color: '#2ed573',
      border: '1px solid rgba(46, 213, 115, 0.3)'
    },
    warning: {
      background: 'rgba(255, 165, 2, 0.2)',
      color: '#ffa502',
      border: '1px solid rgba(255, 165, 2, 0.3)'
    },
    danger: {
      background: 'rgba(255, 71, 87, 0.2)',
      color: '#ff4757',
      border: '1px solid rgba(255, 71, 87, 0.3)'
    }
  }

  const style = variants[variant] || variants.default

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 600,
      ...style
    }}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  )
}
