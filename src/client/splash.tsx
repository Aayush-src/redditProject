import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-navy px-4">
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-4xl font-black tracking-tight">
          <span className="text-emerald">⚽</span>
          <span className="text-text">Transfer</span>
          <span className="text-gold">Quiz</span>
        </div>
        <p className="max-w-[280px] text-center text-sm text-muted">
          Can you identify the footballer from their transfer history?
        </p>
      </div>

      <button
        className="mt-8 rounded-xl bg-emerald px-8 py-3 text-base font-bold text-navy transition-all hover:scale-105 hover:brightness-110 active:scale-95"
        onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
      >
        Play Now
      </button>

      <p className="mt-4 text-xs text-muted">
        Hey {context.username ?? 'there'}, tap to start!
      </p>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
