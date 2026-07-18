import React from 'react';

const StatBox = ({ label, val, color = '#fff' }) => (
  <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center shadow-lg">
    <div className="text-[8px] font-black text-slate-500 uppercase mb-1 tracking-widest">{label}</div>
    <div className="text-xl font-black font-mono" style={{ color }}>{val}</div>
  </div>
);

export default function AthleticConsole({ sessionActive, metrics, syncData, autoCenter, setAutoCenter, onLock, onAction }) {
  if (!sessionActive) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center">
        <h2 className="text-white font-black text-2xl uppercase italic mb-6">RunRajya</h2>
        <button onClick={onAction} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-2xl">
          Begin Run Session
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-between">
      <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
        <span>{syncData.isOnline ? '🟢 Live' : '🔴 Buffering'}</span>
        <span>Queue: {syncData.pendingCount}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Distance" val={`${Math.round(metrics.distance)}m`} />
        <StatBox label="Score" val={`+${metrics.points}`} color={metrics.color} />
        <StatBox label="Grids" val={metrics.zonesCount} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setAutoCenter(!autoCenter)} className={`py-4 rounded-2xl text-[10px] font-black uppercase border transition-all ${autoCenter ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-white'}`}>
          {autoCenter ? '🎯 Locked' : '🔓 Free'}
        </button>
        <button onTouchStart={onLock} className="py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white uppercase">
          🔒 Hold Lock
        </button>
      </div>

      <button onClick={onAction} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest">
        End Session
      </button>
    </div>
  );
}