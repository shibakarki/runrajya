import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/db';

export default function Citadel({ metrics }) {
  const { profile, signOut } = useAuth();
  const [goal, setGoal] = useState(5); 
  const progress = metrics?.distance ? Math.min((metrics.distance / (goal * 1000)) * 100, 100) : 0;

  useEffect(() => {
    db.active_session.get('goal').then(res => { if (res) setGoal(Number(res.value)); });
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#050b14] text-slate-100 px-6 pt-28 pb-32 flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center space-x-3">
          <button onClick={signOut} className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">🛡️</button>
          <div>
            <h1 className="font-mono text-sm font-black tracking-wider text-cyan-400 uppercase">RunRajya</h1>
            <p className="text-[9px] text-slate-400 uppercase font-bold">{profile?.username || 'Hero'} // BASE</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-black uppercase">Burn</span>
          <div className="text-3xl font-black font-mono text-amber-400">{Math.round(metrics?.kcal || 0)} <span className="text-[10px] text-slate-500">kcal</span></div>
        </div>
        <div className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-black uppercase">Travel</span>
          <div className="text-3xl font-black font-mono text-emerald-400">{((metrics?.distance || 0) / 1000).toFixed(2)} <span className="text-[10px] text-slate-500">km</span></div>
        </div>
      </div>

      <div className="bg-slate-900/40 p-8 rounded-[40px] border border-slate-800 flex flex-col items-center shadow-2xl">
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="#0f172a" strokeWidth="8" fill="transparent" />
            <circle cx="50" cy="50" r="42" stroke="#06b6d4" strokeWidth="8" fill="transparent" strokeDasharray="263.9" strokeDashoffset={263.9 - (263.9 * progress) / 100} strokeLinecap="round" className="transition-all duration-1000" />
          </svg>
          <span className="absolute text-5xl font-black font-mono">{Math.round(progress)}%</span>
        </div>
        <input type="range" min="1" max="25" step="1" value={goal} onChange={(e) => { setGoal(e.target.value); db.active_session.put({key:'goal', value: e.target.value}); }} className="w-full mt-10 h-1.5 bg-slate-800 rounded-lg appearance-none accent-cyan-500 cursor-pointer" />
        <div className="text-[10px] mt-4 font-black uppercase text-slate-500">Target: {goal} km</div>
      </div>
    </div>
  );
}