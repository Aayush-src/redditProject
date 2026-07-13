import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { FootBetsLogo } from './components/FootBetsLogo';

export const Splash = () => {
  return (
    <div className="relative min-h-full overflow-hidden bg-black">
      <div className="stadium-bg" />
      <div className="pitch-lines" />

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <FootBetsLogo size="lg" />
          <p className="max-w-[300px] text-center text-sm font-medium text-text-dim">
            FootBets track the player from transfer history
          </p>
        </div>

        <button
          className="btn-primary mt-8 max-w-xs"
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          Play Now
        </button>

        <p className="mt-4 text-xs font-medium text-text-dim">
          Hey <span className="text-white">{context.username ?? 'player'}</span>, ready to play?
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
