export function FootBetsLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textClass =
    size === 'lg'
      ? 'text-4xl sm:text-5xl'
      : size === 'sm'
        ? 'text-2xl'
        : 'text-3xl';

  const iconBoxClass =
    size === 'lg' ? 'h-16 w-16 rounded-2xl' : 'h-10 w-10 rounded-xl';

  const iconSize = size === 'lg' ? 34 : 22;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center border border-cyan/20 bg-cyan/10 ${iconBoxClass}`}
      >
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" className="text-cyan" />
          <path
            d="M12 5.5l1.6 2.9 3.2.3-2.3 2.1.7 3.2-3.2-1.7-3.2 1.7.7-3.2-2.3-2.1 3.2-.3L12 5.5z"
            fill="currentColor"
            className="text-gold"
          />
        </svg>
      </div>
      <div className={`flex items-baseline gap-1.5 ${textClass} font-black tracking-tight`}>
        <span className="text-cyan">FOOT</span>
        <span className="text-gold">BETS</span>
      </div>
    </div>
  );
}
