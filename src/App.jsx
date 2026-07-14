import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useGPS } from './hooks/useGPS';

// Existing Pages (Restored)
import Landing from './pages/Landing';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

// New Architecture Pages
import Citadel from './pages/Citadel';
import IncursionMap from './pages/Map';

export default function App() {
  const { user, loading } = useAuth();
  
  // Navigation State: 'SECTOR' (Citadel), 'RANKS' (Leaderboard), 'PROFILE'
  const [activeTab, setActiveTab] = useState('SECTOR');
  
  // Map Deployment State
  const [deployed, setDeployed] = useState(false);
  
  // GPS Engine (Only runs active sessions when deployed)
  const { position, metrics, heading, error } = useGPS(deployed);

  // 1. Loading Shield
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#050b14] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Auth Gate: If no user, show the Landing Page (which contains the Auth modal)
  if (!user) {
    return <Landing />;
  }

  // 3. Authenticated Citadel Environment
  return (
    <div className="relative overflow-hidden h-screen w-screen bg-[#050b14]">
      
      {/* MAIN CONTENT AREA */}
      <main className="h-full w-full">
        {activeTab === 'RANKS' && <Leaderboard />}
        
        {activeTab === 'SECTOR' && (
          <Citadel 
            metrics={metrics} 
            onDeploy={() => setDeployed(true)} 
          />
        )}
        
        {activeTab === 'PROFILE' && <Profile />}
      </main>

      {/* PERSISTENT BOTTOM NAVIGATION (From your mockup) */}
      {!deployed && (
        <div className="fixed bottom-6 left-4 right-4 max-w-sm mx-auto bg-slate-950/90 backdrop-blur-lg rounded-2xl border border-slate-800/80 px-6 py-3 flex justify-around items-center shadow-2xl z-40 animate-in fade-in slide-in-from-bottom-4">
          
          {/* RANKS (Leaderboard) */}
          <button 
            onClick={() => setActiveTab('RANKS')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'RANKS' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider uppercase">Ranks</span>
          </button>

          {/* SECTOR (Citadel/Dashboard) */}
          <button 
            onClick={() => setActiveTab('SECTOR')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'SECTOR' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8m-9 3h12a3 3 0 003-3V7a3 3 0 00-3-3H6a3 3 0 00-3 3v10a3 3 0 003 3z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider uppercase">Sector</span>
          </button>

          {/* PROFILE */}
          <button 
            onClick={() => setActiveTab('PROFILE')}
            className={`flex flex-col items-center space-y-1 transition-colors ${activeTab === 'PROFILE' ? 'text-cyan-400' : 'text-slate-400'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="text-[10px] font-bold tracking-wider uppercase">Profile</span>
          </button>
        </div>
      )}

      {/* INCURSION MAP (Sliding Overlay) */}
      <div 
        className={`fixed inset-0 z-50 transition-transform duration-500 ease-in-out ${
          deployed ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {deployed && (
          <IncursionMap 
            position={position} 
            metrics={metrics} 
            heading={heading} 
            error={error} 
            onAbort={() => setDeployed(false)} 
          />
        )}
      </div>

    </div>
  );
}