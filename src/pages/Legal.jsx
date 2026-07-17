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
      position: 'fixed', 
      inset: 0, 
      zIndex: 5000, 
      background: 'rgba(5, 11, 20, 0.98)',
      backdropFilter: 'blur(15px)', 
      /* 
         ADJUSTMENT: 
         We use 90px top padding to clear the custom navigation island pill 
         plus env(safe-area-inset-top) for the phone's hardware notch.
      */
      padding: 'calc(env(safe-area-inset-top) + 90px) 24px 24px 24px', 
      display: 'flex', 
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      
      {/* HEADER AREA */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <h2 style={{ 
          color: '#06b6d4', 
          fontWeight: 900, 
          fontSize: 18, 
          textTransform: 'uppercase', 
          margin: 0,
          letterSpacing: '-0.02em'
        }}>
          {content[tab].title}
        </h2>
        
        {/* Close Button: Styled to look like a tactical reset button */}
        <button 
          onClick={onClose} 
          style={{ 
            background: '#14152a', 
            border: '1px solid #1e2042', 
            borderRadius: '12px',
            width: '40px',
            height: '40px',
            color: '#ef4444', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          ✕
        </button>
      </div>

      {/* TACTICAL TAB SWITCHER */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 20,
        overflowX: 'auto',
        paddingBottom: '4px'
      }} className="no-scrollbar">
        {['CONTACT', 'PRIVACY', 'TERMS'].map(t => (
          <button 
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '12px 20px', 
              borderRadius: '14px', 
              fontSize: '10px', 
              fontWeight: 900,
              whiteSpace: 'nowrap',
              background: tab === t ? '#06b6d4' : '#14152a',
              color: tab === t ? '#000' : '#64748b',
              border: tab === t ? 'none' : '1px solid #1e2042', 
              cursor: 'pointer', 
              transition: 'all 0.2s ease',
              letterSpacing: '0.1em'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* CONTENT BOX */}
      <div style={{ 
        flex: 1, 
        background: '#0f1020', 
        borderRadius: '24px', 
        border: '1px solid #1e2042', 
        padding: '24px', 
        color: '#94a3b8', 
        fontSize: '14px', 
        lineHeight: '1.7',
        overflowY: 'auto',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
      }}>
        {content[tab].text}
      </div>

      {/* FOOTER */}
      <div style={{ 
        marginTop: 24, 
        paddingBottom: 'env(safe-area-inset-bottom)',
        textAlign: 'center'
      }}>
        <p style={{ 
          color: '#1e2042', 
          fontSize: '9px', 
          fontWeight: 900, 
          margin: 0,
          letterSpacing: '5px',
          textTransform: 'uppercase'
        }}>
          Tactical Hudson Protocol
        </p>
      </div>
    </div>
  );
}