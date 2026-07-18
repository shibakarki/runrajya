import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import MapPage from './pages/Map';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

function NavigationPill() {
  const location = useLocation();
  const active = (path) => location.pathname === path ? 'text-cyan-400' : 'text-slate-500';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[5000] bg-slate-900/90 backdrop-blur-xl border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-8 shadow-2xl">
      <Link to="/ranks" className={`text-xs font-black uppercase tracking-widest ${active('/ranks')}`}>🏆 Ranks</Link>
      <Link to="/map" className={`text-xs font-black uppercase tracking-widest ${active('/map')}`}>🗺️ Map</Link>
      <Link to="/profile" className={`text-xs font-black uppercase tracking-widest ${active('/profile')}`}>👤 Profile</Link>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="h-screen w-screen bg-[#080810]" />;
  if (!user) return <Landing />;

  return (
    <Router>
      <div className="h-screen w-screen bg-[#080810] flex flex-col overflow-hidden">
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