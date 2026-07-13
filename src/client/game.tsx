import './index.css';

import { StrictMode, useEffect, useRef, useState, useCallback, useMemo, type CSSProperties, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../server/trpc';
import type { Club, Jersey, Manager, LeaderboardEntry, PlayerProfile, RoundEarnings } from '../shared/types';
import { LoadingScreen } from './components/LoadingScreen';
import { GameBackground } from './components/GameBackground';
import { GameHeader } from './components/GameHeader';
import { PlayerCard } from './components/PlayerCard';
import { TransferRouteHero } from './components/TransferRouteHero';
import { WagerChips } from './components/WagerChips';
import { cn } from './utils';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InitData = RouterOutputs['init']['get'];

type GuessEntry = { text: string; correct: boolean; count?: number };

function pseudoRand(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function ParticleBurst({ active }: { active: boolean }) {
  const pieces = useMemo(() => {
    if (!active) return [];
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      bx: `${(pseudoRand(i * 2 + 1) - 0.5) * 120}px`,
      by: `${(pseudoRand(i * 2 + 2) - 0.5) * 120}px`,
      color: ['#ffffff', '#e0e0e0', '#bdbdbd'][i % 3] as string,
      left: '50%',
      top: '45%',
    }));
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="particle-burst"
          style={
            {
              left: p.left,
              top: p.top,
              backgroundColor: p.color,
              '--bx': p.bx,
              '--by': p.by,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function RoundMeter({
  score,
  wager,
  animate,
}: {
  score: number;
  wager: number;
  animate: boolean;
}) {
  const projected = Math.round(score * wager * 100) / 100;
  const pct = Math.max(0, score);

  return (
    <div className="round-meter">
      <div className="round-meter-top">
        <span className="mode-title">Round</span>
        <span className={cn('round-meter-score', animate && 'round-meter-score-pop')}>
          {projected}
        </span>
      </div>
      <div className="round-meter-bar">
        <div className="round-meter-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Confetti ────────────────────────────────────────────

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => {
      const colors = ['#ffffff', '#f5f5f5', '#e0e0e0', '#bdbdbd', '#9e9e9e'];
      return {
        id: i,
        left: `${pseudoRand(i + 10) * 100}%`,
        color: colors[i % colors.length] as string,
        size: 4 + pseudoRand(i + 20) * 7,
        delay: `${pseudoRand(i + 30) * 2.5}s`,
        dur: `${2 + pseudoRand(i + 40) * 3}s`,
        rotation: pseudoRand(i + 50) * 360,
      };
    })
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
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ─── Clue Chips ──────────────────────────────────────────

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
          className="clue-token animate-slide-in-right"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <span>👕</span>
          <span className="text-white">#{j.number}</span>
          <div
            className="h-3 w-3 rounded-full border"
            style={{ backgroundColor: j.primaryColor, borderColor: j.secondaryColor }}
          />
        </div>
      ))}
      {managers.map((m, i) => (
        <div
          key={`m-${i}`}
          className="clue-token animate-slide-in-right"
          style={{ animationDelay: `${(jerseys.length + i) * 0.1}s` }}
        >
          <span>🧑‍💼</span>
          <span>{m.name.split(' ').pop()}</span>
        </div>
      ))}
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const handleKeyDown = (e: KeyboardEvent) => {
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
      <div className="game-input">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-dim">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
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
            className="game-guess-btn"
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
                  ? 'bg-white/10 text-white'
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
  icon: ReactNode;
  label: string;
  cost: number;
  onClick: () => void;
  disabled: boolean;
  variant?: 'default' | 'danger';
}) {
  return (
    <button
      className={cn(
        'hint-chip',
        variant === 'danger' && 'hint-chip-danger',
        disabled && 'pointer-events-none opacity-35'
      )}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span>{label}</span>
      {cost > 0 && variant !== 'danger' && (
        <span className="hint-chip-cost">-{cost}</span>
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

// ─── Guess History ───────────────────────────────────────

function GuessHistory({
  guesses,
}: {
  guesses: GuessEntry[];
}) {
  const last = guesses[guesses.length - 1];
  if (!last) return null;

  return (
    <div
      className={cn(
        'guess-toast',
        last.correct ? 'guess-toast-success' : 'guess-toast-error',
        !last.correct && 'animate-shake'
      )}
    >
      <span className="font-black">{last.correct ? '✓' : '✗'}</span>
      <span className={cn(!last.correct && 'line-through opacity-70')}>{last.text}</span>
      {last.correct && last.count && last.count > 1 && (
        <span className="ml-auto text-[10px] font-bold">×{last.count}</span>
      )}
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
        <span className="text-xs font-bold uppercase tracking-widest text-white">{title}</span>
        <span className="text-[10px] font-medium text-text-dim">{entries.length} players</span>
      </div>
      {entries.map((entry) => (
        <div
          key={entry.username}
          className={cn(
            'flex items-center justify-between border-b border-glass-border/50 px-5 py-3 transition',
            entry.username === currentUser && 'bg-white/5'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black',
                entry.rank === 1
                  ? 'bg-white/20 text-white'
                  : entry.rank === 2
                    ? 'bg-text-dim/15 text-text'
                    : entry.rank === 3
                      ? 'bg-white/10 text-text-dim'
                      : 'bg-surface text-text-dim'
              )}
            >
              {entry.rank}
            </span>
            <div className="flex flex-col">
              <span
                className={cn(
                  'text-sm font-semibold',
                  entry.username === currentUser ? 'text-white' : 'text-text'
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
            <span className="text-sm font-black tabular-nums text-white">{entry.score}</span>
            <span className="text-[10px] font-medium text-text-dim">{entry.percentage}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function getClubInitials(name: string): string {
  if (!name) return '?';
  const words = name.replace(/FC|CF|AC|AS|SS|SC|RC|CD|UD|SD|SL|BSC|TSG|RB/gi, '').trim().split(/\s+/);
  if (words.length === 1) return (words[0] ?? '').slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join('').slice(0, 3).toUpperCase();
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
    <div className="relative flex w-full max-w-[480px] flex-col items-center gap-6">
      {perfect && <Confetti />}

      <div className="animate-slide-up flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">{perfect ? '🏆' : '⭐'}</span>
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {perfect ? 'PERFECT GAME!' : 'PLAYER IDENTIFIED'}
        </h2>
        <p className="text-xl font-bold text-text sm:text-2xl">{playerName}</p>
      </div>

      <GameHeader profile={profile} />

      <div className="route-hero w-full">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-text-dim">
          Complete Career Path
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {clubs.map((club, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border"
                style={{
                  background: `linear-gradient(145deg, ${club.primaryColor}, ${club.secondaryColor})`,
                  borderColor: `${club.secondaryColor}88`,
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

      <div className="glass-card w-full p-6">
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
            <span className="text-sm font-bold text-white">{earnings?.wagerEarnings ?? projected}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
            <span className="text-[10px] text-text-dim">Streak Bonus</span>
            <span className="text-sm font-bold text-white">+{earnings?.streakBonus ?? 0}</span>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-surface/50 px-2 py-2">
            <span className="text-[10px] text-text-dim">Total Earned</span>
            <span className="text-sm font-bold text-white">+{earnings?.totalEarned ?? projected}</span>
          </div>
        </div>
      </div>

      <div className="grid w-full gap-4 md:grid-cols-2">
        <ScoutLeaderboard title="Daily Leaderboard" entries={dailyLeaderboard} currentUser={currentUser} />
        <ScoutLeaderboard title="Global Leaderboard" entries={globalLeaderboard} currentUser={currentUser} />
      </div>

      {onPlayAgain && (
        <button
          className="btn-primary w-full"
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
  const [shakeCard, setShakeCard] = useState(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [flashType, setFlashType] = useState<'success' | 'error' | null>(null);
  const [scorePopup, setScorePopup] = useState<{ value: number; index: number } | null>(null);
  const [burst, setBurst] = useState(false);

  if (state.mode !== 'guess-player') return null;

  const wager = state.wager;
  const wagerLocked = state.wagerLocked;

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

  const triggerFeedback = (type: 'success' | 'error', index?: number, popup?: number) => {
    if (type === 'error') {
      setShakeCard(true);
      setTimeout(() => setShakeCard(false), 500);
      if (index !== undefined) {
        setFlashIndex(index);
        setFlashType('error');
        setTimeout(() => {
          setFlashIndex(null);
          setFlashType(null);
        }, 500);
      }
    } else {
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
      if (index !== undefined) {
        setFlashIndex(index);
        setFlashType('success');
        setTimeout(() => {
          setFlashIndex(null);
          setFlashType(null);
        }, 800);
      }
      if (popup !== undefined && index !== undefined) {
        setScorePopup({ value: popup, index });
        setTimeout(() => setScorePopup(null), 1000);
      }
    }
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
    if (!result.correct) {
      triggerScoreAnim();
      triggerFeedback('error');
    } else {
      triggerFeedback('success', undefined, Math.round(result.state.score * wager));
    }
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
    if (newIdx !== null) {
      triggerFeedback('success', newIdx);
    }
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
    <div className="game-screen relative z-10">
      <ParticleBurst active={burst} />
      <GameHeader profile={profile} />

      <div className="game-hero-section">
        <p className="mode-title">Mystery Player</p>

        <div className={cn(shakeCard && 'animate-shake')}>
          <PlayerCard mystery />
        </div>

        <div className="w-full">
          <TransferRouteHero
            clubs={clubItems}
            animateIndex={animateClubIdx}
            flashIndex={flashIndex}
            flashType={flashType}
            scorePopup={scorePopup}
          />
        </div>

        <ClueChips jerseys={revealedJerseys} managers={revealedManagers} />

        <RoundMeter score={state.score} wager={wager} animate={scoreAnimate} />

        <div className="w-full">
          <GuessInput
            placeholder="Who is this player?"
            searchFn={(q) => trpc.search.players.query({ query: q })}
            onSubmit={handleGuess}
            disabled={loading || state.solved}
          />
        </div>

        <GuessHistory guesses={guesses} />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <HintButton
            icon={ShieldIcon}
            label="Club"
            cost={currentHintCost}
            onClick={handleRevealClub}
            disabled={loading || unrevealed === 0}
          />
          <HintButton
            icon={ShirtIcon}
            label="Jersey"
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
      </div>

      <div className="game-bottom-dock">
        <WagerChips
          selected={wager}
          locked={wagerLocked}
          onSelect={handleWagerChange}
          disabled={loading || state.solved}
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
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [flashType, setFlashType] = useState<'success' | 'error' | null>(null);
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const [scorePopup, setScorePopup] = useState<{ value: number; index: number } | null>(null);
  const [burst, setBurst] = useState(false);

  if (state.mode !== 'predict-transfers') return null;

  const wager = state.wager;
  const wagerLocked = state.wagerLocked;
  const nationality = initData.playerNationality;
  const playerFlag = initData.playerFlag;

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

  const firstHiddenIdx = state.hiddenClubIndices.find(
    (i) => !state.guessedClubIndices.includes(i)
  ) ?? null;

  const triggerFeedback = (type: 'success' | 'error', index?: number, popup?: number) => {
    if (type === 'error' && index !== undefined) {
      setShakeIndex(index);
      setFlashIndex(index);
      setFlashType('error');
      setTimeout(() => {
        setShakeIndex(null);
        setFlashIndex(null);
        setFlashType(null);
      }, 500);
    } else if (type === 'success') {
      setBurst(true);
      setTimeout(() => setBurst(false), 700);
      if (index !== undefined) {
        setFlashIndex(index);
        setFlashType('success');
        setTimeout(() => {
          setFlashIndex(null);
          setFlashType(null);
        }, 800);
      }
      if (popup !== undefined && index !== undefined) {
        setScorePopup({ value: popup, index });
        setTimeout(() => setScorePopup(null), 1000);
      }
    }
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
      const idx = result.matchedIndices[0];
      if (idx !== undefined) {
        setAnimateClubIdx(idx);
        triggerFeedback('success', idx, Math.round(result.state.score * result.state.wager));
        setTimeout(() => setAnimateClubIdx(null), 700);
      }
    } else {
      setGuesses((prev) => [...prev, { text: clubName, correct: false }]);
      triggerScoreAnim();
      triggerFeedback('error', firstHiddenIdx ?? undefined);
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
      triggerFeedback('success', result.revealedIndex);
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
    <div className="game-screen relative z-10">
      <ParticleBurst active={burst} />
      <GameHeader profile={profile} />

      <div className="game-hero-section">
        <p className="mode-title">Transfer Route</p>

        <PlayerCard name={state.playerName} flag={playerFlag} country={nationality} rating={89} />

        <div className="w-full">
          <TransferRouteHero
            clubs={clubItems}
            animateIndex={animateClubIdx}
            shakeIndex={shakeIndex}
            flashIndex={flashIndex}
            flashType={flashType}
            scorePopup={scorePopup}
          />
        </div>

        <RoundMeter score={state.score} wager={wager} animate={scoreAnimate} />

        {unguessedCount > 0 && (
          <div className="w-full">
            <GuessInput
              placeholder="Name the missing club..."
              searchFn={(q) => trpc.search.clubs.query({ query: q })}
              onSubmit={handleGuess}
              disabled={loading || state.solved}
            />
          </div>
        )}

        <GuessHistory guesses={guesses} />

        <div className="flex flex-wrap items-center justify-center gap-2">
          <HintButton
            icon={ShieldIcon}
            label="Club"
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
      </div>

      <div className="game-bottom-dock">
        <WagerChips
          selected={wager}
          locked={wagerLocked}
          onSelect={handleWagerChange}
          disabled={loading || state.solved}
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

  const loadSolvedData = useCallback(async (earnings: RoundEarnings | null = null, baseData?: InitData) => {
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
  }, []);

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
  }, [loadSolvedData]);

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
      <GameBackground />

      {/* Content */}
      <div className="relative z-10 flex min-h-full w-full flex-col items-center">
        {solved && solvedData ? (
          <div className="game-screen relative z-10 py-8">
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
