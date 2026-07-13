import { FootballBall } from './FootballBall';
import { FootBetsLogo } from './FootBetsLogo';

export function LoadingScreen() {
  return (
    <div className="loading-screen fixed inset-0 z-[100] overflow-hidden bg-black">
      <div className="pitch-lines absolute inset-0" />

      <div className="loading-ball-stage absolute inset-0 flex items-center justify-center">
        <div className="loading-ball-wrap">
          <FootballBall className="loading-ball h-[min(72vw,72vh)] w-[min(72vw,72vh)]" />
        </div>
      </div>

      <div className="loading-brand absolute inset-x-0 bottom-[12%] z-10 flex flex-col items-center gap-3 px-6 text-center">
        <FootBetsLogo size="lg" />
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-text-dim">
          Loading match
        </p>
        <div className="loading-progress mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="loading-progress-bar h-full rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
