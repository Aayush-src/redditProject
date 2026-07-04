import './index.css';

import { StrictMode, useEffect, useRef, useState, useCallback, useMemo, Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../server/trpc';
import type { Club, Jersey, Manager, LeaderboardEntry, PlayerProfile, RoundEarnings } from '../shared/types';
import { WAGER_OPTIONS } from '../shared/scoring';
import { FootBetsLogo } from './components/FootBetsLogo';
import { LoadingScreen } from './components/LoadingScreen';
import { cn } from './utils';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InitData = RouterOutputs['init']['get'];

type GuessEntry = { text: string; correct: boolean; count?: number };

// ─── Floating Particles ──────────────────────────────────

function Particles() {
  const dots = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: `${5 + Math.random() * 90}%`,
        top: `${5 + Math.random() * 90}%`,
        size: 2 + Math.random() * 2.5,
        delay: `${Math.random() * 6}s`,
        dur: `${5 + Math.random() * 7}s`,
        opacity: 0.15 + Math.random() * 0.2,
      })),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden">
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute rounded-full bg-cyan"
          style={{
            left: d.left,
            top: d.top,
            width: d.size,
            height: d.size,
            opacity: d.opacity,
            animation: `float-particle ${d.dur} ease-in-out ${d.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Confetti ────────────────────────────────────────────

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const colors = ['#00e5ff', '#ffd700', '#00ff88', '#a855f7', '#ff8c00'];
        return {
          id: i,
          left: `${Math.random() * 100}%`,
          color: colors[i % colors.length] as string,
          size: 4 + Math.random() * 7,
          delay: `${Math.random() * 2.5}s`,
          dur: `${2 + Math.random() * 3}s`,
          rotation: Math.random() * 360,
        };
      }),
    []
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="animate-confetti absolute"
          style={
            {
              left: p.left,
              top: '-12px',
              width: p.size,
              height: p.size * 0.6,
              backgroundColor: p.color,
              borderRadius: '2px',
              transform: `rotate(${p.rotation}deg)`,
              '--delay': p.delay,
              '--dur': p.dur,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ─── App Logo ────────────────────────────────────────────

function AppLogo() {
  return <FootBetsLogo size="sm" />;
}

// ─── Daily Challenge Badge ───────────────────────────────

function DailyBadge() {
  const today = new Date();
  const dayStr = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <div className="glass-card-sm flex items-center gap-2 px-4 py-2">
      <div className="h-2 w-2 animate-pulse rounded-full bg-success" />
      <span className="text-xs font-semibold uppercase tracking-widest text-text-dim">Daily Challenge</span>
      <span className="text-xs font-medium text-cyan">{dayStr}</span>
    </div>
  );
}

// ─── Timeline Node ───────────────────────────────────────

function TimelineNode({
  club,
  hidden,
  animate,
}: {
  club: Club | null;
  hidden: boolean;
  animate?: boolean;
}) {
  if (hidden) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="animate-glow-pulse flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-cyan/15 bg-surface/80 transition-transform hover:scale-105"
        >
          <div className="h-10 w-10 rounded-xl bg-cyan/8 blur-[2px]" />
        </div>
        <span className="max-w-[80px] truncate text-center text-[11px] font-medium text-text-dim">
          ???
        </span>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', animate && 'animate-flip-reveal')}>
      <div
        className={cn(
          'flex h-[72px] w-[72px] items-center justify-center rounded-2xl border transition-transform hover:scale-105',
          animate && 'animate-reveal-glow'
        )}
        style={{
          background: `linear-gradient(135deg, ${club?.primaryColor ?? '#1e293b'}dd, ${club?.secondaryColor ?? '#334155'}aa)`,
          borderColor: `${club?.secondaryColor ?? '#334155'}66`,
        }}
      >
        <span className="text-lg font-bold text-white/90 drop-shadow-sm">
          {getClubInitials(club?.name ?? '')}
        </span>
      </div>
      <span
        className="max-w-[80px] truncate text-center text-[11px] font-medium text-text"
        title={club?.name}
      >
        {club?.name ?? '???'}
      </span>
    </div>
  );
}

function getClubInitials(name: string): string {
  if (!name) return '?';
  const words = name.replace(/FC|CF|AC|AS|SS|SC|RC|CD|UD|SD|SL|BSC|TSG|RB/gi, '').trim().split(/\s+/);
  if (words.length === 1) return (words[0] ?? '').slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
}

// ─── Timeline Arrow ──────────────────────────────────────

function TimelineArrowEl() {
  return <div className="timeline-arrow mx-1 self-start mt-[34px]" />;
}

// ─── Transfer Timeline ──────────────────────────────────

function TransferTimeline({
  clubs,
  animateIndex,
}: {
  clubs: { index: number; club: Club | null; revealed: boolean }[];
  animateIndex: number | null;
}) {
  return (
    <div className="glass-card glow-cyan w-full overflow-x-auto px-6 py-8">
      <div className="flex items-start justify-center gap-1" style={{ minWidth: 'min-content' }}>
        {clubs.map((item, i) => (
          <Fragment key={item.index}>
            <TimelineNode
              club={item.club}
              hidden={!item.revealed}
              animate={animateIndex === item.index}
            />
            {i < clubs.length - 1 && <TimelineArrowEl />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Clue Chips (revealed jerseys / managers) ────────────

function ClueChips({
  jerseys,
  managers,
}: {
  jerseys: Jersey[];
  managers: Manager[];
}) {
  if (jerseys.length === 0 && managers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {jerseys.map((j, i) => (
        <div
          key={`j-${i}`}
          className="glass-card-sm animate-slide-in-right flex items-center gap-2 px-3 py-1.5"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <span className="text-sm">👕</span>
          <span className="text-xs font-semibold text-gold">#{j.number}</span>
          <div
            className="h-3 w-3 rounded-full border"
            style={{ backgroundColor: j.primaryColor, borderColor: j.secondaryColor }}
          />
        </div>
      ))}
      {managers.map((m, i) => (
        <div
          key={`m-${i}`}
          className="glass-card-sm animate-slide-in-right flex items-center gap-2 px-3 py-1.5"
          style={{ animationDelay: `${(jerseys.length + i) * 0.1}s` }}
        >
          <span className="text-sm">🧑‍💼</span>
          <span className="text-xs font-semibold text-text">{m.name}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Player Stats Bar ────────────────────────────────────

function PlayerStatsBar({ profile }: { profile: PlayerProfile }) {
  return (
    <div className="glass-card-sm flex flex-wrap items-center justify-center gap-4 px-4 py-2">
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-text-dim">Total</span>
        <span className="text-sm font-black tabular-nums text-gold">{profile.totalPoints}</span>
      </div>
      <div className="h-6 w-px bg-glass-border" />
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-text-dim">Today</span>
        <span className="text-sm font-black tabular-nums text-cyan">{profile.dailyScore}</span>
      </div>
      <div className="h-6 w-px bg-glass-border" />
      <div className="flex flex-col items-center">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-text-dim">Streak</span>
        <span className="text-sm font-black tabular-nums text-success">
          {profile.streak > 0 ? `🔥 ${profile.streak}` : '—'}
        </span>
      </div>
    </div>
  );
}

// ─── Wager Selector ──────────────────────────────────────

function WagerSelector({
  selected,
  locked,
  onSelect,
  disabled,
}: {
  selected: number;
  locked: boolean;
  onSelect: (wager: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="glass-card w-full p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-text-dim">Wager Multiplier</span>
        {locked ? (
          <span className="text-[10px] font-semibold text-gold">Locked</span>
        ) : (
          <span className="text-[10px] font-medium text-text-dim">Choose before your first guess</span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {WAGER_OPTIONS.map((wager) => {
          const active = selected === wager;
          return (
            <button
              key={wager}
              className={cn(
                'glass-card-sm flex flex-col items-center gap-0.5 px-2 py-2.5 transition-all',
                active && 'scale-[1.03] border-gold/40',
                !locked && !disabled && 'hover:scale-[1.03]',
                (locked || disabled) && !active && 'opacity-40'
              )}
              style={{
                boxShadow: active ? '0 0 16px rgba(255,215,0,0.15)' : undefined,
              }}
              onClick={() => onSelect(wager)}
              disabled={locked || disabled}
            >
              <span className={cn('text-sm font-black tabular-nums', active ? 'text-gold' : 'text-text-dim')}>
                ×{wager}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Guess Input ─────────────────────────────────────────

function GuessInput({
  placeholder,
  searchFn,
  onSubmit,
  disabled,
}: {
  placeholder: string;
  searchFn: (q: string) => Promise<string[]>;
  onSubmit: (value: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      const results = await searchFn(query);
      setSuggestions(results.slice(0, 6));
      setSelectedIdx(-1);
    },
    [searchFn]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 180);
  };

  const handleSelect = (name: string) => {
    setValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    onSubmit(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx >= 0 && suggestions[selectedIdx]) {
        handleSelect(suggestions[selectedIdx]);
      } else if (value.trim()) {
        handleSelect(value.trim());
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="glass-card flex items-center gap-3 px-5 py-3 transition-all focus-within:border-cyan/30 focus-within:shadow-[0_0_20px_rgba(0,229,255,0.1)]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-dim">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          className="w-full bg-transparent text-sm font-medium text-text placeholder:text-text-dim/60 outline-none"
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          disabled={disabled}
        />
        {value.trim() && (
          <button
            className="flex-shrink-0 rounded-lg bg-cyan px-4 py-1.5 text-xs font-bold text-bg transition hover:brightness-110 active:scale-95"
            onMouseDown={(e) => {
              e.preventDefault();
              if (selectedIdx >= 0 && suggestions[selectedIdx]) {
                handleSelect(suggestions[selectedIdx]);
              } else {
                handleSelect(value.trim());
              }
            }}
          >
            GUESS
          </button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="glass-card absolute top-full left-0 z-20 mt-2 w-full overflow-hidden">
          {suggestions.map((name, idx) => (
            <button
              key={name}
              className={cn(
                'flex w-full items-center gap-3 px-5 py-3 text-left text-sm font-medium transition',
                idx === selectedIdx
                  ? 'bg-cyan/10 text-cyan'
                  : 'text-text hover:bg-white/[0.03]'
              )}
              onMouseDown={() => handleSelect(name)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-dim">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hint Button ─────────────────────────────────────────

function HintButton({
  icon,
  label,
  cost,
  onClick,
  disabled,
  variant = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  cost: number;
  onClick: () => void;
  disabled: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      className={cn(
        'glass-card-sm flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-95',
        variant === 'danger'
          ? 'border-danger/20 text-danger hover:bg-danger/8'
          : 'border-cyan/10 text-text hover:border-cyan/25 hover:text-cyan',
        disabled && 'pointer-events-none opacity-35'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{label}</span>
      {cost > 0 && variant !== 'danger' && (
        <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold">
          -{cost}
        </span>
      )}
    </button>
  );
}

// SVG icons for hint buttons
const ShieldIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ShirtIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.38 3.46 16 2 12 5 8 2 3.62 3.46a2 2 0 0 0-1.34 1.91l.23 9.09A2 2 0 0 0 4.46 16h0a2 2 0 0 0 1.54-.79L8 13V22h8V13l2 2.21a2 2 0 0 0 1.54.79h0a2 2 0 0 0 1.95-1.54l.23-9.09a2 2 0 0 0-1.34-1.91Z" />
  </svg>
);

const PersonIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const XIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// ─── Scout Rating Panel ──────────────────────────────────

function ScoutRating({
  score,
  wrongGuesses,
  wager,
  animate,
}: {
  score: number;
  wrongGuesses: number;
  wager: number;
  animate: boolean;
}) {
  const projected = Math.round(score * wager * 100) / 100;
  const pct = Math.max(0, score);

  return (
    <div className="glass-card w-full p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-text-dim">Round Score</span>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-semibold text-text-dim">×{wager}</span>
          <span
            className={cn(
              'text-3xl font-black tabular-nums tracking-tight',
              pct > 50 ? 'text-cyan' : pct > 20 ? 'text-gold' : 'text-danger',
              animate && 'animate-score-pop'
            )}
          >
            {projected}
          </span>
        </div>
      </div>
      <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: pct > 50
              ? 'linear-gradient(90deg, #00e5ff, #00ff88)'
              : pct > 20
                ? 'linear-gradient(90deg, #ffd700, #ff8c00)'
                : 'linear-gradient(90deg, #ff4757, #ff6b81)',
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
          <span className="text-[10px] font-medium text-text-dim">Base</span>
          <span className="text-sm font-bold text-text">{score}/100</span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
          <span className="text-[10px] font-medium text-text-dim">Attempts</span>
          <span className="text-sm font-bold text-text">{wrongGuesses}</span>
        </div>
        <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
          <span className="text-[10px] font-medium text-text-dim">Wager</span>
          <span className="text-sm font-bold text-gold">×{wager}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Guess History ───────────────────────────────────────

function GuessHistory({
  guesses,
  penaltyLabel = '-5',
}: {
  guesses: GuessEntry[];
  penaltyLabel?: string;
}) {
  if (guesses.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-1.5">
      {guesses.map((g, i) => (
        <div
          key={i}
          className={cn(
            'glass-card-sm flex items-center gap-2 px-4 py-2 text-sm',
            g.correct ? 'border-success/20 text-success' : 'border-danger/15 text-danger',
            i === guesses.length - 1 && !g.correct && 'animate-shake'
          )}
        >
          <span className="font-bold">{g.correct ? '✓' : '✗'}</span>
          <span className={cn('font-medium', !g.correct && 'line-through opacity-60')}>{g.text}</span>
          {g.correct && g.count && g.count > 1 && (
            <span className="ml-auto text-[10px] font-bold text-success">×{g.count} filled</span>
          )}
          {!g.correct && (
            <span className="ml-auto text-[10px] font-bold text-text-dim">{penaltyLabel}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard ─────────────────────────────────────────

function ScoutLeaderboard({
  title,
  entries,
  currentUser,
}: {
  title: string;
  entries: LeaderboardEntry[];
  currentUser: string;
}) {
  if (entries.length === 0) {
    return (
      <div className="glass-card w-full p-5 text-center">
        <span className="text-xs font-semibold text-text-dim">No players yet. Be the first!</span>
      </div>
    );
  }

  return (
    <div className="glass-card w-full overflow-hidden">
      <div className="flex items-center justify-between border-b border-glass-border px-5 py-3">
        <span className="text-xs font-bold uppercase tracking-widest text-gold">{title}</span>
        <span className="text-[10px] font-medium text-text-dim">{entries.length} players</span>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.username}
          className={cn(
            'flex items-center justify-between border-b border-glass-border/50 px-5 py-3 transition',
            entry.username === currentUser && 'bg-cyan/5'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black',
                entry.rank === 1
                  ? 'bg-gold/20 text-gold'
                  : entry.rank === 2
                    ? 'bg-text-dim/15 text-text'
                    : entry.rank === 3
                      ? 'bg-legend/15 text-legend'
                      : 'bg-surface text-text-dim'
              )}
            >
              {entry.rank}
            </span>
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-sm font-semibold',
                  entry.username === currentUser ? 'text-cyan' : 'text-text'
                )}
              >
                {entry.username}
              </span>
              {entry.streak !== undefined && entry.streak > 0 && (
                <span className="text-[10px] text-text-dim">🔥 {entry.streak} day streak</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-black tabular-nums text-gold">{entry.score}</span>
            <span className="text-[10px] font-medium text-text-dim">{entry.percentage}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Solved Screen ───────────────────────────────────────

function SolvedScreen({
  playerName,
  clubs,
  score,
  wager,
  earnings,
  profile,
  globalLeaderboard,
  dailyLeaderboard,
  currentUser,
  onPlayAgain,
  perfect,
}: {
  playerName: string;
  clubs: Club[];
  score: number;
  wager: number;
  earnings: RoundEarnings | null;
  profile: PlayerProfile;
  globalLeaderboard: LeaderboardEntry[];
  dailyLeaderboard: LeaderboardEntry[];
  currentUser: string;
  onPlayAgain?: () => void;
  perfect: boolean;
}) {
  const projected = Math.round(score * wager * 100) / 100;

  return (
    <div className="relative flex w-full max-w-3xl flex-col items-center gap-6 px-4">
      {perfect && <Confetti />}

      <div className="animate-slide-up flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">{perfect ? '🏆' : '⭐'}</span>
        <h2
          className="text-3xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #00e5ff, #00ff88)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {perfect ? 'PERFECT GAME!' : 'PLAYER IDENTIFIED'}
        </h2>
        <p className="text-2xl font-bold text-text">{playerName}</p>
      </div>

      <PlayerStatsBar profile={profile} />

      <div className="glass-card glow-success w-full p-6">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">
          Complete Career Path
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {clubs.map((club, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  background: `linear-gradient(135deg, ${club.primaryColor}dd, ${club.secondaryColor}aa)`,
                  borderColor: `${club.secondaryColor}55`,
                }}
              >
                <span className="text-[10px] font-bold text-white/90">{getClubInitials(club.name)}</span>
              </div>
              <span className="text-xs font-medium text-text">{club.name}</span>
              {i < clubs.length - 1 && <span className="mx-1 text-text-dim/40">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card glow-cyan w-full p-6">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">
          Round Earnings
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
            <span className="text-[10px] text-text-dim">Base × Wager</span>
            <span className="text-sm font-bold text-text">{score} × {wager}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
            <span className="text-[10px] text-text-dim">Wager Win</span>
            <span className="text-sm font-bold text-cyan">{earnings?.wagerEarnings ?? projected}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
            <span className="text-[10px] text-text-dim">Streak Bonus</span>
            <span className="text-sm font-bold text-success">+{earnings?.streakBonus ?? 0}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
            <span className="text-[10px] text-text-dim">Total Earned</span>
            <span className="text-sm font-bold text-gold">+{earnings?.totalEarned ?? projected}</span>
          </div>
        </div>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        <ScoutLeaderboard title="Daily Leaderboard" entries={dailyLeaderboard} currentUser={currentUser} />
        <ScoutLeaderboard title="Global Leaderboard" entries={globalLeaderboard} currentUser={currentUser} />
      </div>

      {onPlayAgain && (
        <button
          className="glow-cyan w-full rounded-2xl bg-gradient-to-r from-cyan to-[#00ff88] px-8 py-4 text-sm font-black uppercase tracking-wider text-bg transition hover:brightness-110 active:scale-[0.98]"
          onClick={onPlayAgain}
        >
          Play Again
        </button>
      )}
    </div>
  );
}

// ─── Mode 1: Guess the Player ────────────────────────────

function GuessPlayerMode({
  initData,
  onSolved,
}: {
  initData: InitData;
  onSolved: (earnings: RoundEarnings | null) => void;
}) {
  const [state, setState] = useState(initData.state);
  const [profile, setProfile] = useState<PlayerProfile>(initData.profile);
  const [clues, setClues] = useState(initData.clues);
  const [revealedJerseys, setRevealedJerseys] = useState<Jersey[]>(initData.revealedJerseys ?? []);
  const [revealedManagers, setRevealedManagers] = useState<Manager[]>(initData.revealedManagers ?? []);
  const [currentHintCost, setCurrentHintCost] = useState(initData.hintCost);
  const [jerseyHintCost, setJerseyHintCost] = useState(initData.jerseyHintCost);
  const [managerHintCost, setManagerHintCost] = useState(initData.managerHintCost);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [scoreAnimate, setScoreAnimate] = useState(false);
  const [animateClubIdx, setAnimateClubIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.mode !== 'guess-player') return null;

  const wager = state.wager;
  const wagerLocked = state.wagerLocked;
  const wrongGuessPenalty = Math.round(5 * wager * 100) / 100;

  const clubItems: { index: number; club: Club | null; revealed: boolean }[] =
    (clues as Club[]).map((club, i) => ({ index: i, club, revealed: true }));

  const unrevealed = state.totalClubs - state.revealedClubIndices.length;
  for (let i = 0; i < unrevealed; i++) {
    clubItems.push({ index: state.revealedClubIndices.length + i, club: null, revealed: false });
  }

  const totalJerseys = state.totalClubs;
  const totalManagers = state.totalClubs;
  const jerseysLeft = totalJerseys - (state.revealedJerseyIndices?.length ?? 0);
  const managersLeft = totalManagers - (state.revealedManagerIndices?.length ?? 0);

  const triggerScoreAnim = () => {
    setScoreAnimate(true);
    setTimeout(() => setScoreAnimate(false), 400);
  };

  const handleWagerChange = async (nextWager: number) => {
    if (wagerLocked || loading) return;
    setLoading(true);
    const result = await trpc.game.setWager.mutate({ wager: nextWager });
    setState(result.state);
    setCurrentHintCost(result.hintCost);
    setJerseyHintCost(result.jerseyHintCost);
    setManagerHintCost(result.managerHintCost);
    setLoading(false);
  };

  const handleGuess = async (guess: string) => {
    setLoading(true);
    const result = await trpc.game.guessPlayer.mutate({ guess });
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    setJerseyHintCost(result.jerseyHintCost);
    setManagerHintCost(result.managerHintCost);
    if (result.profile) setProfile(result.profile);
    setGuesses((prev) => [...prev, { text: guess, correct: result.correct }]);
    if (!result.correct) triggerScoreAnim();
    if (result.correct) onSolved(result.earnings);
    setLoading(false);
  };

  const handleRevealClub = async () => {
    setLoading(true);
    const result = await trpc.game.revealClub.mutate();
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    setJerseyHintCost(result.jerseyHintCost);
    setManagerHintCost(result.managerHintCost);
    if (result.profile) setProfile(result.profile);
    const newIdx = result.state.revealedClubIndices[result.state.revealedClubIndices.length - 1] ?? null;
    setAnimateClubIdx(newIdx);
    triggerScoreAnim();
    setTimeout(() => setAnimateClubIdx(null), 700);
    if (result.state.solved) onSolved(result.earnings);
    setLoading(false);
  };

  const handleRevealJersey = async () => {
    setLoading(true);
    const result = await trpc.game.revealJersey.mutate();
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    setJerseyHintCost(result.jerseyHintCost);
    setManagerHintCost(result.managerHintCost);
    setRevealedJerseys(result.revealedJerseys);
    triggerScoreAnim();
    setLoading(false);
  };

  const handleRevealManager = async () => {
    setLoading(true);
    const result = await trpc.game.revealManager.mutate();
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    setJerseyHintCost(result.jerseyHintCost);
    setManagerHintCost(result.managerHintCost);
    setRevealedManagers(result.revealedManagers);
    triggerScoreAnim();
    setLoading(false);
  };

  const handleGiveUp = async () => {
    setLoading(true);
    const result = await trpc.game.giveUp.mutate();
    if (result.profile) setProfile(result.profile);
    onSolved(null);
    setLoading(false);
  };

  return (
    <div className="relative z-10 flex w-full flex-col items-center gap-6 px-4 py-8">
      {/* Header */}
      <div className="flex w-full max-w-4xl flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between">
          <AppLogo />
          <DailyBadge />
        </div>
        <PlayerStatsBar profile={profile} />
      </div>

      {/* Mode Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight text-text">Identify the Mystery Footballer</h2>
        <p className="mt-1 text-xs font-medium text-text-dim">
          Analyse the career timeline below and name the player
        </p>
      </div>

      {/* Transfer Timeline — Hero */}
      <div className="w-[95%] max-w-5xl lg:w-[80%]">
        <TransferTimeline clubs={clubItems} animateIndex={animateClubIdx} />
      </div>

      {/* Clue Chips */}
      <ClueChips jerseys={revealedJerseys} managers={revealedManagers} />

      {/* Wager */}
      <div className="w-full max-w-xl">
        <WagerSelector
          selected={wager}
          locked={wagerLocked}
          onSelect={handleWagerChange}
          disabled={loading || state.solved}
        />
      </div>

      {/* Guess Input */}
      <div className="w-full max-w-xl">
        <GuessInput
          placeholder="Search for a player..."
          searchFn={(q) => trpc.search.players.query({ query: q })}
          onSubmit={handleGuess}
          disabled={loading || state.solved}
        />
      </div>

      {/* Guess History */}
      <div className="w-full max-w-xl">
        <GuessHistory guesses={guesses} penaltyLabel={`-${wrongGuessPenalty}`} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <HintButton
          icon={ShieldIcon}
          label="Reveal Club"
          cost={currentHintCost}
          onClick={handleRevealClub}
          disabled={loading || unrevealed === 0}
        />
        <HintButton
          icon={ShirtIcon}
          label="Jersey Number"
          cost={jerseyHintCost}
          onClick={handleRevealJersey}
          disabled={loading || jerseysLeft <= 0}
        />
        <HintButton
          icon={PersonIcon}
          label="Manager"
          cost={managerHintCost}
          onClick={handleRevealManager}
          disabled={loading || managersLeft <= 0}
        />
        <HintButton
          icon={XIcon}
          label="Give Up"
          cost={0}
          onClick={handleGiveUp}
          disabled={loading}
          variant="danger"
        />
      </div>

      {/* Scout Rating */}
      <div className="w-full max-w-xl">
        <ScoutRating
          score={state.score}
          wrongGuesses={state.wrongGuesses}
          wager={wager}
          animate={scoreAnimate}
        />
      </div>
    </div>
  );
}

// ─── Mode 2: Predict Transfer Route ─────────────────────

function PredictTransfersMode({
  initData,
  onSolved,
}: {
  initData: InitData;
  onSolved: (earnings: RoundEarnings | null) => void;
}) {
  const [state, setState] = useState(initData.state);
  const [profile, setProfile] = useState<PlayerProfile>(initData.profile);
  const [clues, setClues] = useState(initData.clues);
  const [currentHintCost, setCurrentHintCost] = useState(initData.hintCost);
  const [guesses, setGuesses] = useState<GuessEntry[]>([]);
  const [scoreAnimate, setScoreAnimate] = useState(false);
  const [animateClubIdx, setAnimateClubIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.mode !== 'predict-transfers') return null;

  const wager = state.wager;
  const wagerLocked = state.wagerLocked;
  const wrongGuessPenalty = Math.round(10 * wager * 100) / 100;

  type ClueItem = { index: number; club: Club | null; revealed: boolean };
  const clubItems = (clues as ClueItem[]).map((item) => ({
    ...item,
    revealed: item.revealed || state.guessedClubIndices.includes(item.index),
  }));

  const unguessedCount = state.hiddenClubIndices.filter(
    (i) => !state.guessedClubIndices.includes(i)
  ).length;

  const triggerScoreAnim = () => {
    setScoreAnimate(true);
    setTimeout(() => setScoreAnimate(false), 400);
  };

  const handleWagerChange = async (nextWager: number) => {
    if (wagerLocked || loading) return;
    setLoading(true);
    const result = await trpc.game.setWager.mutate({ wager: nextWager });
    setState(result.state);
    setCurrentHintCost(result.hintCost);
    setLoading(false);
  };

  const handleGuess = async (clubName: string) => {
    setLoading(true);
    const result = await trpc.game.guessTransferClub.mutate({ clubName });
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);

    if (result.profile) setProfile(result.profile);

    if (result.correct) {
      setGuesses((prev) => [
        ...prev,
        { text: clubName, correct: true, count: result.matchedIndices.length },
      ]);
      if (result.matchedIndices.length > 0) {
        setAnimateClubIdx(result.matchedIndices[0] ?? null);
        setTimeout(() => setAnimateClubIdx(null), 700);
      }
    } else {
      setGuesses((prev) => [...prev, { text: clubName, correct: false }]);
      triggerScoreAnim();
    }

    if (result.state.solved) onSolved(result.earnings);
    setLoading(false);
  };

  const handleRevealHint = async () => {
    setLoading(true);
    const result = await trpc.game.revealTransferHint.mutate();
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    if (result.profile) setProfile(result.profile);
    if (result.revealedIndex !== null) {
      setAnimateClubIdx(result.revealedIndex);
      triggerScoreAnim();
      setTimeout(() => setAnimateClubIdx(null), 700);
    }
    if (result.state.solved) onSolved(result.earnings);
    setLoading(false);
  };

  const handleGiveUp = async () => {
    setLoading(true);
    const result = await trpc.game.giveUp.mutate();
    if (result.profile) setProfile(result.profile);
    onSolved(null);
    setLoading(false);
  };

  return (
    <div className="relative z-10 flex w-full flex-col items-center gap-6 px-4 py-8">
      {/* Header */}
      <div className="flex w-full max-w-4xl flex-col items-center gap-3">
        <div className="flex w-full items-center justify-between">
          <AppLogo />
          <DailyBadge />
        </div>
        <PlayerStatsBar profile={profile} />
      </div>

      {/* Mode Title */}
      <div className="text-center">
        <h2 className="text-xl font-bold tracking-tight text-text">Complete the Transfer Route</h2>
        <p
          className="mt-1 text-lg font-bold"
          style={{
            background: 'linear-gradient(90deg, #00e5ff, #ffd700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {state.playerName}
        </p>
        <p className="mt-1 text-xs font-medium text-text-dim">
          Fill in the missing clubs · {unguessedCount} remaining
        </p>
      </div>

      {/* Transfer Timeline — Hero */}
      <div className="w-[95%] max-w-5xl lg:w-[80%]">
        <TransferTimeline clubs={clubItems} animateIndex={animateClubIdx} />
      </div>

      {/* Wager */}
      <div className="w-full max-w-xl">
        <WagerSelector
          selected={wager}
          locked={wagerLocked}
          onSelect={handleWagerChange}
          disabled={loading || state.solved}
        />
      </div>

      {/* Guess Input */}
      {unguessedCount > 0 && (
        <div className="w-full max-w-xl">
          <GuessInput
            placeholder="Search for a club..."
            searchFn={(q) => trpc.search.clubs.query({ query: q })}
            onSubmit={handleGuess}
            disabled={loading || state.solved}
          />
        </div>
      )}

      {/* Guess History */}
      <div className="w-full max-w-xl">
        <GuessHistory guesses={guesses} penaltyLabel={`-${wrongGuessPenalty}`} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <HintButton
          icon={ShieldIcon}
          label="Reveal Club"
          cost={currentHintCost}
          onClick={handleRevealHint}
          disabled={loading || unguessedCount === 0}
        />
        <HintButton
          icon={XIcon}
          label="Give Up"
          cost={0}
          onClick={handleGiveUp}
          disabled={loading}
          variant="danger"
        />
      </div>

      {/* Scout Rating */}
      <div className="w-full max-w-xl">
        <ScoutRating
          score={state.score}
          wrongGuesses={state.wrongGuesses}
          wager={wager}
          animate={scoreAnimate}
        />
      </div>
    </div>
  );
}

// ─── Loading Screen (imported from components) ───────────

// ─── App ─────────────────────────────────────────────────

export const App = () => {
  const [initData, setInitData] = useState<InitData | null>(null);
  const [solved, setSolved] = useState(false);
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [solvedData, setSolvedData] = useState<{
    playerName: string;
    clubs: Club[];
    score: number;
    wager: number;
    earnings: RoundEarnings | null;
    profile: PlayerProfile;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await trpc.init.get.query();
        setInitData(data);
        if (data.state.solved) {
          setSolved(true);
          await loadSolvedData(null, data);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load game');
      }
    };
    void load();
  }, []);

  const loadSolvedData = async (earnings: RoundEarnings | null = null, baseData?: InitData) => {
    try {
      const [freshInit, globalLb, dailyLb] = await Promise.all([
        baseData ? Promise.resolve(baseData) : trpc.init.get.query(),
        trpc.leaderboard.global.query(),
        trpc.leaderboard.daily.query(),
      ]);
      setSolvedData({
        playerName: freshInit.playerName,
        clubs: freshInit.fullClubs ?? [],
        score: freshInit.state.score,
        wager: freshInit.state.wager,
        earnings,
        profile: freshInit.profile,
      });
      setGlobalLeaderboard(globalLb);
      setDailyLeaderboard(dailyLb);
      setInitData(freshInit);
    } catch {
      // leaderboard fetch failed silently
    }
  };

  const handleSolved = (earnings: RoundEarnings | null) => {
    setSolved(true);
    void loadSolvedData(earnings);
  };

  const handlePlayAgain = async () => {
    await trpc.game.reset.mutate();
    setSolved(false);
    setSolvedData(null);
    setGlobalLeaderboard([]);
    setDailyLeaderboard([]);
    const data = await trpc.init.get.query();
    setInitData(data);
  };

  const isPerfect = solvedData?.score === 100;

  if (!initData) {
    if (error) {
      return (
        <div className="relative flex min-h-full items-center justify-center bg-bg px-4">
          <div className="glass-card p-6 text-center">
            <p className="text-sm font-medium text-danger">{error}</p>
          </div>
        </div>
      );
    }
    return <LoadingScreen />;
  }

  return (
    <div className="relative min-h-full w-full">
      {/* Background layers */}
      <div className="stadium-bg" />
      <div className="pitch-lines" />
      <div className="vignette" />
      <Particles />

      {/* Content */}
      <div className="relative z-10 flex min-h-full w-full flex-col items-center">
        {solved && solvedData ? (
          <div className="flex min-h-full w-full items-center justify-center px-4 py-8">
            <SolvedScreen
              playerName={solvedData.playerName}
              clubs={solvedData.clubs}
              score={solvedData.score}
              wager={solvedData.wager}
              earnings={solvedData.earnings}
              profile={solvedData.profile}
              globalLeaderboard={globalLeaderboard}
              dailyLeaderboard={dailyLeaderboard}
              currentUser={initData.username ?? ''}
              onPlayAgain={handlePlayAgain}
              perfect={isPerfect}
            />
          </div>
        ) : initData.state.mode === 'guess-player' ? (
          <GuessPlayerMode initData={initData} onSolved={handleSolved} />
        ) : (
          <PredictTransfersMode initData={initData} onSolved={handleSolved} />
        )}
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
