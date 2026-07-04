export function FootballBall({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ball-shade" cx="38%" cy="32%" r="68%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#f4f4f4" />
          <stop offset="100%" stopColor="#c8c8c8" />
        </radialGradient>
        <radialGradient id="ball-highlight" cx="28%" cy="22%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="panel-dark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#050505" />
        </linearGradient>
        <filter id="ball-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      <circle cx="256" cy="256" r="228" fill="url(#ball-shade)" filter="url(#ball-shadow)" />

      {/* Classic pentagon / hexagon panel layout */}
      <g fill="url(#panel-dark)">
        <path d="M256 72 L296 134 L278 206 L234 206 L216 134 Z" />
        <path d="M256 72 L334 118 L318 188 L296 134 Z" opacity="0.92" />
        <path d="M256 72 L178 118 L194 188 L216 134 Z" opacity="0.92" />
        <path d="M334 118 L382 188 L350 252 L318 188 Z" />
        <path d="M178 118 L130 188 L162 252 L194 188 Z" />
        <path d="M382 188 L350 286 L286 318 L350 252 Z" />
        <path d="M130 188 L162 286 L226 318 L162 252 Z" />
        <path d="M350 286 L286 382 L226 382 L286 318 Z" />
        <path d="M162 286 L226 382 L286 382 L226 318 Z" />
        <path d="M286 382 L256 440 L226 382 Z" />
        <path d="M350 252 L398 256 L382 188 Z" opacity="0.85" />
        <path d="M162 252 L114 256 L130 188 Z" opacity="0.85" />
        <path d="M286 318 L318 360 L350 286 Z" opacity="0.8" />
        <path d="M226 318 L194 360 L162 286 Z" opacity="0.8" />
      </g>

      {/* Seam lines */}
      <g stroke="#0d0d0d" strokeWidth="2.2" strokeLinejoin="round" fill="none" opacity="0.55">
        <path d="M256 72 L296 134 L278 206 L234 206 L216 134 Z" />
        <path d="M334 118 L382 188 L350 252 L318 188 Z" />
        <path d="M178 118 L130 188 L162 252 L194 188 Z" />
        <path d="M350 286 L286 382 L226 382 L286 318 Z" />
      </g>

      <circle cx="256" cy="256" r="228" fill="url(#ball-highlight)" />
    </svg>
  );
}
