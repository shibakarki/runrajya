import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';

export default function Citadel({ metrics }) {
  const { profile, signOut } = useAuth();
  const [goal, setGoal] = useState(5); // Default 5km goal
  const progress = Math.min((metrics.distance / (goal * 1000)) * 100, 100);

  // Recovery: Load saved operational goal
  useEffect(() => {
    db.active_session.get('goal').then(res => {
      if (res) setGoal(res.value);
    });
  }, []);

  const handleGoalChange = (val) => {
    const num = Number(val);
    setGoal(num);
    db.active_session.put({ key: 'goal', value: num });
  };

  return (
    <div className="min-h-screen w-full bg-[#050b14] text-slate-100 px-6 pt-24 pb-32 flex flex-col justify-between overflow-y-auto no-scrollbar">
      
      {/* HEADER PROTOCOL */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <button 
            onClick={signOut}
            className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold hover:bg-rose-500/20 hover:border-rose-500 transition-all"
            title="Abort Connection"
          >
            🛡️
          </button>
          <div>
            <h1 className="font-mono text-sm font-black tracking-wider text-cyan-400 uppercase">RunRajya</h1>
            <p className="text-[9px] text-slate-400 tracking-[0.2em] uppercase font-bold">
              {profile?.username || 'Explorer'} // Base
            </p>
          </div>
        </div>
        <div className="bg-slate-900 px-4 py-1.5 rounded-full border border-slate-800 text-[10px] font-black text-slate-500 uppercase tracking-widest">
           System Online
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-800/80">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Energy</span>
            <span className="text-amber-500 text-sm">🔥</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-black font-mono text-amber-400">{Math.round(metrics.kcal)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">kcal</span>
          </div>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-md p-5 rounded-3xl border border-slate-800/80">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Distance</span>
            <span className="text-emerald-500 text-sm">🏃</span>
          </div>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-black font-mono text-emerald-400">{(metrics.distance / 1000).toFixed(2)}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">km</span>
          </div>
        </div>
      </div>

      {/* MISSION RING */}
      <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-[40px] border border-slate-800/60 flex flex-col items-center shadow-2xl">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="#0f172a" strokeWidth="8" fill="transparent" />
            <circle cx="50" cy="50" r="42" stroke="#06b6d4" strokeWidth="8" fill="transparent" 
              strokeDasharray="263.9" strokeDashoffset={263.9 - (263.9 * progress) / 100} 
              strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-[10px] tracking-[0.3em] text-slate-500 uppercase font-black">Goal</span>
            <span className="text-5xl font-black font-mono mt-1 text-white">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* OPERATIONAL GOAL SLIDER */}
        <div className="w-full mt-10 border-t border-slate-800/80 pt-6">
          <div className="flex justify-between items-center text-[10px] mb-4 font-black uppercase tracking-widest">
            <span className="text-slate-500">Mission Target</span>
            <span className="text-cyan-400 font-mono text-xs">{goal} km</span>
          </div>
          <input 
            type="range" min="1" max="25" step="1" value={goal} 
            onChange={(e) => handleGoalChange(e.target.value)}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-cyan-500 cursor-pointer shadow-inner" 
          />
        </div>
      </div>

      {/* TACTICAL FOOTER */}
      <div className="mt-10 text-center">
        <p className="text-[9px] text-slate-600 font-black tracking-[0.5em] uppercase italic">
          Rupandehi Tactical Command // v2.0.4
        </p>
      </div>

    </div>
  );
}