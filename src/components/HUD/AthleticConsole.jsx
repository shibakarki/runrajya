import React, { useState, useRef } from 'react';

const StatBox = ({ label, val, color = '#fff' }) => (
  <div className="bg-white/5 p-3 md:p-5 rounded-2xl border border-white/5 text-center shadow-inner flex flex-col justify-center">
    <div className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">{label}</div>
    <div className="text-xl md:text-3xl font-black font-mono tracking-tighter" style={{ color }}>{val}</div>
  </div>
);

export default function AthleticConsole({ sessionActive, metrics, syncData, autoCenter, setAutoCenter, onLock, onAction }) {
  const [holdProgress, setHoldHoldProgress] = useState(0);
  const timerRef = useRef(null);

  const startHold = (e) => {
    e.preventDefault();
    let start = Date.now();
    timerRef.current = setInterval(() => {
      let p = Math.min(((Date.now() - start) / 1500) * 100, 100);
      setHoldHoldProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current);
        onLock();
        setHoldHoldProgress(0);
      }
    }, 50);
  };

  const cancelHold = () => {
    clearInterval(timerRef.current);
    setHoldHoldProgress(0);
  };

  if (!sessionActive) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="space-y-2">
            <h2 className="text-white font-black text-3xl md:text-5xl uppercase italic tracking-tighter">RunRajya</h2>
            <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-[0.4em]">Sector: Rupandehi</p>
        </div>
        <button 
          onClick={onAction} 
          className="w-full max-w-xs py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs md:text-sm uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(37,99,235,0.4)] transition-all active:scale-95"
        >
          Begin Incursion
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col justify-between md:justify-around py-2 md:py-10">
      
      {/* Sync Status Badge */}
      <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full animate-pulse ${syncData.isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {syncData.isOnline ? 'Live Uplink' : 'Data Buffering'}
          </span>
        </div>
        <span className="text-[9px] font-bold text-slate-500">Queue: {syncData.pendingCount}</span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <StatBox label="Distance" val={`${Math.round(metrics.distance)}m`} />
        <StatBox label="Points" val={`+${metrics.points}`} color={metrics.color} />
        <StatBox label="Sectors" val={metrics.zonesCount} />
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <button 
          onClick={() => setAutoCenter(!autoCenter)} 
          className={`py-4 md:py-6 rounded-2xl text-[10px] md:text-xs font-black uppercase border transition-all ${autoCenter ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' : 'bg-white/5 border-white/10 text-slate-500'}`}
        >
          {autoCenter ? '🎯 Locked' : '🔓 Free'}
        </button>
        
        <button 
          onTouchStart={startHold} 
          onTouchEnd={cancelHold}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          className="py-4 md:py-6 bg-white/5 border border-white/10 rounded-2xl text-[10px] md:text-xs font-black text-white uppercase relative overflow-hidden active:bg-white/10 transition-colors"
        >
          <div className="absolute inset-y-0 left-0 bg-blue-600/20 pointer-events-none" style={{ width: `${holdProgress}%` }}></div>
          🔒 Pocket Lock
        </button>
      </div>

      {/* End Session Button */}
      <button 
        onClick={onAction} 
        className="w-full py-5 md:py-7 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl text-xs md:text-sm uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95"
      >
        Extract & End
      </button>
    </div>
  );
}