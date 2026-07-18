import React, { useState } from 'react';

export default function PocketLock({ distance, zonesCount, onUnlock }) {
  const [slider, setSlider] = useState(0);

  const handleSlider = (e) => {
    const val = parseInt(e.target.value);
    setSlider(val);
    if (val >= 90) {
      onUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-around p-10 select-none touch-none">
      <div className="text-center">
        <div className="text-8xl mb-8 animate-pulse">🔒</div>
        <h2 className="text-white font-black text-4xl tracking-tighter uppercase italic">Pocket Locked</h2>
        <p className="text-blue-500 font-black text-xs tracking-[0.5em] mt-4 opacity-50">TRACKING ACTIVE</p>
      </div>

      <div className="w-full max-w-xs">
         <div className="flex justify-between items-center px-4 mb-12">
            <div className="text-center">
              <div className="text-slate-600 text-[8px] font-black uppercase mb-1 tracking-widest">Distance</div>
              <div className="text-white font-black text-3xl tracking-tighter">{Math.round(distance)}m</div>
            </div>
            <div className="text-center">
              <div className="text-slate-600 text-[8px] font-black uppercase mb-1 tracking-widest">Grids</div>
              <div className="text-white font-black text-3xl tracking-tighter">{zonesCount}</div>
            </div>
         </div>

         <div className="relative h-24 bg-white/5 rounded-[35px] border border-white/10 p-2 flex items-center overflow-hidden">
            <input 
              type="range" min="0" max="100" value={slider} 
              onChange={handleSlider} 
              onTouchEnd={() => setSlider(0)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
            />
            <div className="w-20 h-20 bg-blue-600 rounded-[28px] flex items-center justify-center text-3xl shadow-2xl transition-all" style={{ marginLeft: `${slider * 0.7}%` }}>→</div>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-blue-500/40 pointer-events-none uppercase tracking-[0.4em]">Slide to Unlock</div>
         </div>
      </div>

      {/* OS-Wake Lock Failsafe Video */}
      <video playsInline muted loop className="hidden">
        <source src="data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDJpc29tYXZjMQAAAZptb292AAAAbG12aG" type="video/mp4" />
      </video>
    </div>
  );
}