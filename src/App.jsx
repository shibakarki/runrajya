import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useGPS } from './hooks/useGPS';

// Pages
import Landing from './pages/Landing';
import MapPage from './pages/Map';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import Citadel from './pages/Citadel';

function DynamicIslandNav() {
  const location = useLocation();
  const active = (path) => location.pathname === path 
    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
    : 'text-slate-400 border-transparent';

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[5000] w-[94%] max-w-md">
      <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-1.5 rounded-full flex items-center justify-between shadow-2xl">
        <Link to="/" className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${active('/')}`}>
          <span className="text-xs">🏰</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Base</span>
        </Link>
        <Link to="/map" className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${active('/map')}`}>
          <span className="text-xs">🗺️</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Map</span>
        </Link>
        <Link to="/ranks" className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${active('/ranks')}`}>
          <span className="text-xs">🏆</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Ranks</span>
        </Link>
        <Link to="/profile" className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${active('/profile')}`}>
          <span className="text-xs">👤</span>
          <span className="text-[10px] font-black uppercase tracking-widest">Hero</span>
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  
  // Initialize GPS with fallback metrics
  const gps = useGPS(true) || { metrics: { distance: 0, kcal: 0 } };

  if (loading) return (
    <div className="h-screen w-screen bg-[#080810] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Landing />;

  return (
    <Router>
      <div className="h-screen w-screen bg-[#080810] flex flex-col overflow-hidden text-slate-100">
        <DynamicIslandNav />
        <Routes>
          <Route path="/" element={<Citadel metrics={gps.metrics} />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/ranks" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}