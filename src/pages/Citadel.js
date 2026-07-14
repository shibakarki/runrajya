import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';

export default function Citadel({ metrics, onDeploy }) {
  const { profile } = useAuth();
  const [goal, setGoal] = useState(5); // Default 5km
  const progress = Math.min((metrics.distance / (goal * 1000)) * 100, 100);

  useEffect(() => {
    db.active_session.get('goal').then(res => {
      if (res) setGoal(res.value);
    });
  }, []);

  const handleGoalChange = (val) => {
    setGoal(val);
    db.active_session.put({ key: 'goal', value: val });
  };

  return (
    <div className="max-w-md mx-auto w-full px-4 pt-6 pb-28 flex flex-col justify-between min-h-screen bg-[#050b14] text-slate-100">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">🛡️</div>
          <div>
            <h1 className="font-mono text-sm font-black tracking-wider text-cyan-400 uppercase">RunRajya</h1>
            <p className="text-[9px] text-slate-400 tracking-widest uppercase font-semibold">Rupandehi Citadel</p>
          </div>
        </div>
        <button onClick={onDeploy} className="bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-1.5 rounded-xl border border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black text-xs tracking-widest uppercase">MAP</button>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricCard label="Energy Burn" val={Math.round(metrics.kcal)} unit="kcal" icon="🔥" color="text-amber-400" />
        <MetricCard label="Distance" val={(metrics.distance / 1000).toFixed(2)} unit="km" icon="🏃" color="text-emerald-400" />
      </div>

      {/* Progress Ring */}
      <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800/60 flex flex-col items-center">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="40" stroke="#0f172a" strokeWidth="8" fill="transparent" />
            <circle cx="50" cy="50" r="40" stroke="#06b6d4" strokeWidth="8" fill="transparent" 
              strokeDasharray="251.2" strokeDashoffset={251.2 - (251.2 * progress) / 100} 
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-[9px] tracking-widest text-slate-400 uppercase">Mission</span>
            <span className="text-4xl font-black font-mono mt-1">{Math.round(progress)}%</span>
            <span className="text-[8px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 mt-1 font-black uppercase">Live Track</span>
          </div>
        </div>

        {/* Goal Slider */}
        <div className="w-full mt-6 border-t border-slate-800/80 pt-4">
          <div className="flex justify-between items-center text-[10px] mb-2 font-bold">
            <span className="text-slate-400 uppercase">Operational Goal</span>
            <span className="text-cyan-400 font-mono">{goal} km</span>
          </div>
          <input type="range" min="1" max="20" step="1" value={goal} 
            onChange={(e) => handleGoalChange(e.target.value)}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none accent-cyan-500 cursor-pointer" />
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-6">
        <button onClick={onDeploy} className="w-full py-4 bg-cyan-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl hover:bg-cyan-500 transition-all">
          Deploy Incursion
        </button>
      </div>

    </div>
  );
}

function MetricCard({ label, val, unit, icon, color }) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80">
      <div className="flex justify-between text-[9px] tracking-wider text-slate-400 font-bold uppercase mb-2">
        <span>{label}</span>
        <span>{icon}</span>
      </div>
      <div className="flex items-baseline space-x-1">
        <span className={`text-3xl font-black font-mono ${color}`}>{val}</span>
        <span className="text-[10px] font-bold text-slate-500 uppercase">{unit}</span>
      </div>
    </div>
  );
}