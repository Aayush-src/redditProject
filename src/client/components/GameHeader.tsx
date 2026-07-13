import type { PlayerProfile } from '../../shared/types';
import { FootBetsLogo } from './FootBetsLogo';
import { cn } from '../utils';

function HudStat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string | number;
  accent: 'gold' | 'cyan' | 'success';
  icon?: string;
}) {
  return (
    <div className="hud-stat">
      <span className="hud-stat-label">{label}</span>
      <span className={cn('hud-stat-value', `hud-stat-${accent}`)}>
        {icon && <span className="mr-0.5">{icon}</span>}
        {value}
      </span>
    </div>
  );
}

export function GameHeader({ profile }: { profile: PlayerProfile }) {
  const today = new Date();
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="game-header w-full max-w-lg">
      <div className="game-header-top">
        <FootBetsLogo size="sm" />
        <div className="daily-pill">
          <span className="daily-pill-dot" />
          <span className="daily-pill-text">Daily</span>
          <span className="daily-pill-date">{dayStr}</span>
        </div>
      </div>
      <div className="hud-bar">
        <HudStat label="Total" value={profile.totalPoints} accent="gold" />
        <div className="hud-divider" />
        <HudStat label="Today" value={profile.dailyScore} accent="cyan" />
        <div className="hud-divider" />
        <HudStat
          label="Streak"
          value={profile.streak > 0 ? profile.streak : '—'}
          accent="success"
          {...(profile.streak > 0 ? { icon: '🔥' } : {})}
        />
      </div>
    </header>
  );
}
