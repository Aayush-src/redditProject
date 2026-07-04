import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Background */}
      <div className="stadium-bg" />
      <div className="vignette" />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/20 bg-cyan/10">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black tracking-tight text-cyan">SCOUT</span>
            <span className="text-4xl font-black tracking-tight text-gold">MODE</span>
          </div>
          <p className="max-w-[280px] text-center text-sm font-medium text-text-dim">
            Can you identify the mystery footballer from their career clues?
          </p>
        </div>

        <button
          className="glow-cyan mt-8 rounded-2xl bg-gradient-to-r from-cyan to-[#00ff88] px-10 py-3.5 text-sm font-black uppercase tracking-wider text-bg transition-all hover:brightness-110 active:scale-95"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Start Scouting
        </button>

        <p className="mt-4 text-xs font-medium text-text-dim">
          Hey <span className="text-cyan">{context.username ?? 'Scout'}</span>, ready to play?
        </p>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
