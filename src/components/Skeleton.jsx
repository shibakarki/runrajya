export function SkeletonCard({ height = 60 }) {
  return (
    <div
      className="skeleton"
      style={{ height, width: '100%', borderRadius: 10 }}
    />
  )
}

export function SkeletonText({ width = '100%', height = 12 }) {
  return (
    <div
      className="skeleton"
      style={{ height, width, borderRadius: 4 }}
    />
  )
}

export function SkeletonProfile() {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Identity card skeleton */}
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SkeletonText width="60%" height={14} />
            <SkeletonText width="80%" height={10} />
          </div>
        </div>
      </div>
      {/* Stats grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <SkeletonCard height={72} />
        <SkeletonCard height={72} />
        <SkeletonCard height={72} />
        <SkeletonCard height={72} />
      </div>
      <SkeletonCard height={80} />
      <SkeletonCard height={160} />
    </div>
  )
}

export function SkeletonLeaderboard() {
  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
          <div className="skeleton" style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <SkeletonText width="50%" height={12} />
            <SkeletonText width="70%" height={10} />
          </div>
          <SkeletonText width={30} height={18} />
        </div>
      ))}
    </div>
  )
}