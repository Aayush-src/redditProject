import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FootBetsLogo } from './components/FootBetsLogo';

export const Splash = () => {
  return (
    <div className="relative min-h-full overflow-hidden">
      {/* Background */}
      <div className="stadium-bg" />
      <div className="pitch-lines" />
      <div className="vignette" />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <FootBetsLogo size="lg" />
          <p className="max-w-[280px] text-center text-sm font-medium text-text-dim">
            Wager on your football knowledge. Can you crack today&apos;s mystery player?
          </p>
        </div>

        <button
          className="glow-cyan mt-8 rounded-2xl bg-gradient-to-r from-cyan to-[#00ff88] px-10 py-3.5 text-sm font-black uppercase tracking-wider text-bg transition-all hover:brightness-110 active:scale-95"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Play Now
        </button>

        <p className="mt-4 text-xs font-medium text-text-dim">
          Hey <span className="text-cyan">{context.username ?? 'player'}</span>, ready to bet?
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
