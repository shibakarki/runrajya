import React, { useState } from 'react';
import Citadel from './pages/Citadel';
import IncursionMap from './pages/Map';
import { useGPS } from './hooks/useGPS';
import { useAuth } from './context/AuthContext';

export default function App() {
  const { user, loading } = useAuth();
  const [deployed, setDeployed] = useState(false);
  
  // The session is "active" only when the map is deployed
  const { position, metrics, heading, error } = useGPS(deployed);

  if (loading) return <div className="bg-[#050b14] h-screen" />;

  return (
    <div className="relative overflow-hidden h-screen w-screen bg-[#050b14]">
      {/* Citadel Dashboard */}
      <Citadel metrics={metrics} onDeploy={() => setDeployed(true)} />

      {/* Incursion HUD (Sliding Overlay) */}
      <div className={`fixed inset-0 z-50 transition-transform duration-500 ease-in-out ${deployed ? 'translate-y-0' : 'translate-y-full'}`}>
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