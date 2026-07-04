import { FootballBall } from './FootballBall';

export function LoadingScreen() {
  return (
    <div className="loading-screen fixed inset-0 z-[100] overflow-hidden bg-[#04060f]">
      {/* Stadium atmosphere */}
      <div className="loading-stadium-glow absolute inset-0" />
      <div className="loading-speed-lines absolute inset-0" />
      <div className="loading-vignette absolute inset-0" />

      {/* Zooming football */}
      <div className="loading-ball-stage absolute inset-0 flex items-center justify-center">
        <div className="loading-ball-wrap">
          <FootballBall className="loading-ball h-[min(88vw,88vh)] w-[min(88vw,88vh)]" />
          <div className="loading-ball-aura" />
        </div>
      </div>

      {/* Screen takeover flash */}
      <div className="loading-flash absolute inset-0" />

      {/* Branding */}
      <div className="loading-brand absolute inset-x-0 bottom-[12%] z-10 flex flex-col items-center gap-3 px-6 text-center">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black tracking-tight text-cyan sm:text-5xl">FOOT</span>
          <span className="text-4xl font-black tracking-tight text-gold sm:text-5xl">BETS</span>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-text-dim">
          Loading match
        </p>
        <div className="loading-progress mt-2 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="loading-progress-bar h-full rounded-full bg-gradient-to-r from-cyan to-gold" />
        </div>
      </div>
    </div>
  );
}
