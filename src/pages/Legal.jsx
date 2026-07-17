import React, { useState } from 'react';

export default function Legal({ initialTab = 'CONTACT', onClose }) {
  const [tab, setTab] = useState(initialTab);

  const content = {
    PRIVACY: {
      title: "Privacy Protocol",
      text: "RunRajya syncs GPS coordinates strictly during active sessions. Location data is used only to verify grid conquests and calculate fitness metrics. We do not sell or share individual player movement data with outside entities."
    },
    TERMS: {
      title: "Operational Terms",
      text: "Players must engage in physical movement (running, walking, jogging). Motorized transport or GPS spoofing is a violation of the faction code and will result in data purge. You play at your own physical risk."
    },
    CONTACT: {
      title: "Command Contact",
      text: "For tactical glitches or faction inquiries, reach out to HQ at: support@runrajya.com.np. Report cheaters through our community discord channel."
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000, background: 'rgba(5, 11, 20, 0.95)',
      backdropFilter: 'blur(10px)', padding: 24, display: 'flex', flexDirection: 'column'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#06b6d4', fontWeight: 900, fontSize: 18, textTransform: 'uppercase', margin: 0 }}>
          {content[tab].title}
        </h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 24, fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['CONTACT', 'PRIVACY', 'TERMS'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 12px', borderRadius: 8, fontSize: 10, fontWeight: 900,
              background: tab === t ? '#06b6d4' : '#14152a',
              color: tab === t ? '#000' : '#64748b',
              border: 'none', cursor: 'pointer', transition: '0.2s'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, background: '#0f1020', borderRadius: 16, border: '1px solid #1e2042', padding: 20, color: '#94a3b8', fontSize: 13, lineHeight: '1.6' }}>
        {content[tab].text}
      </div>

      <p style={{ textAlign: 'center', color: '#1e2042', fontSize: 9, fontWeight: 900, marginTop: 24, letterSpacing: 4 }}>
        RUNRAJYA TACTICAL HUD V2.0
      </p>
    </div>
  );
}