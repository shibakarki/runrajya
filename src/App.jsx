import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import MapPage from './pages/Map';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

// This component MUST stay inside the <Router> tags
function NavigationPill() {
  const location = useLocation();
  const active = (path) => location.pathname === path ? 'text-cyan-400 border-cyan-400' : 'text-slate-500 border-transparent';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[5000] bg-slate-950/90 backdrop-blur-2xl border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-8 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
      <Link to="/ranks" className={`text-xs font-black uppercase tracking-widest border-b-2 pb-1 transition-all ${active('/ranks')}`}>🏆 Ranks</Link>
      <Link to="/map" className={`text-xs font-black uppercase tracking-widest border-b-2 pb-1 transition-all ${active('/map')}`}>🗺️ Map</Link>
      <Link to="/profile" className={`text-xs font-black uppercase tracking-widest border-b-2 pb-1 transition-all ${active('/profile')}`}>👤 Profile</Link>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#080810] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not logged in, show Landing (Landing handles its own Auth modals)
  if (!user) {
    return <Landing />;
  }

  return (
    <Router>
      <div className="h-screen w-screen bg-[#080810] flex flex-col overflow-hidden text-slate-100">
        <Routes>
          <Route path="/map" element={<MapPage />} />
          <Route path="/ranks" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          {/* Default redirect to Map */}
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
        
        {/* Navigation is now inside the Router context */}
        <NavigationPill />
      </div>
    </Router>
  );
}