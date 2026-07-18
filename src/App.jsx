import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import MapPage from './pages/Map';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

function NavigationPill() {
  const location = useLocation();
  const active = (path) => location.pathname === path ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent';

  // Hide navigation if on the Map and session is active? 
  // For now, let's keep it visible but styled for all screens.
  return (
    <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[5000] bg-slate-950/90 backdrop-blur-2xl border border-slate-800 px-4 py-2 md:px-8 md:py-3 rounded-2xl flex items-center gap-6 md:gap-12 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <Link to="/ranks" className={`text-[10px] md:text-xs font-black uppercase tracking-widest border-b-2 pb-1 transition-all ${active('/ranks')}`}>🏆 Ranks</Link>
      <Link to="/map" className={`text-[10px] md:text-xs font-black uppercase tracking-widest border-b-2 pb-1 transition-all ${active('/map')}`}>🗺️ Map</Link>
      <Link to="/profile" className={`text-[10px] md:text-xs font-black uppercase tracking-widest border-b-2 pb-1 transition-all ${active('/profile')}`}>👤 Profile</Link>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen bg-[#080810] flex items-center justify-center"><div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <Landing />;

  return (
    <Router>
      <div className="h-screen w-screen bg-[#080810] flex flex-col overflow-hidden text-slate-100">
        <Routes>
          <Route path="/map" element={<MapPage />} />
          <Route path="/ranks" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/map" />} />
        </Routes>
        <NavigationPill />
      </div>
    </Router>
  );
}