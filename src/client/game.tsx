import './index.css';

import { StrictMode, useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { trpc } from './trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../server/trpc';
import type { Club, GameState, LeaderboardEntry } from '../shared/types';
import { cn } from './utils';

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InitData = RouterOutputs['init']['get'];

// ─── Club Circle ──────────────────────────────────────────────

function ClubCircle({
  primaryColor,
  secondaryColor,
  size = 48,
  hidden = false,
}: {
  primaryColor: string;
  secondaryColor: string;
  size?: number;
  hidden?: boolean;
}) {
  if (hidden) {
    return (
      <div
        className="flex items-center justify-center rounded-full border-2 border-dashed border-muted"
        style={{ width: size, height: size }}
      >
        <span className="text-muted text-lg">?</span>
      </div>
    );
  }

  return (
    <div
      className="rounded-full border-[3px]"
      style={{
        width: size,
        height: size,
        backgroundColor: primaryColor,
        borderColor: secondaryColor,
      }}
    />
  );
}

// ─── Transfer Route (horizontal scrollable) ───────────────────

function TransferRoute({
  clubs,
  revealedIndices,
  animateIndex,
}: {
  clubs: { index: number; club: Club | null; revealed: boolean }[];
  revealedIndices?: number[];
  animateIndex?: number | null;
}) {
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="flex items-center justify-start gap-1 px-2" style={{ minWidth: 'min-content' }}>
        {clubs.map((item, i) => (
          <div key={item.index} className="flex items-center">
            <div
              className={cn(
                'flex flex-col items-center gap-1.5',
                animateIndex === item.index && 'animate-flip-in'
              )}
            >
              <ClubCircle
                primaryColor={item.club?.primaryColor ?? '#334155'}
                secondaryColor={item.club?.secondaryColor ?? '#475569'}
                size={44}
                hidden={!item.revealed}
              />
              <span
                className={cn(
                  'max-w-[70px] truncate text-center text-[10px] leading-tight',
                  item.revealed ? 'text-text' : 'text-muted'
                )}
                title={item.club?.name}
              >
                {item.revealed ? item.club?.name ?? '???' : '???'}
              </span>
            </div>
            {i < clubs.length - 1 && (
              <div className="mx-1 flex h-[2px] w-6 items-center">
                <div className="h-[2px] w-full bg-muted/40" />
                <div className="ml-[-4px] h-0 w-0 border-t-[4px] border-b-[4px] border-l-[6px] border-t-transparent border-b-transparent border-l-muted/40" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Score Bar ─────────────────────────────────────────────────

function ScoreBar({ score, animate }: { score: number; animate: boolean }) {
  const pct = Math.max(0, score);
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-card">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: pct > 50 ? '#10B981' : pct > 20 ? '#F59E0B' : '#EF4444',
          }}
        />
      </div>
      <span
        className={cn(
          'min-w-[40px] text-right text-lg font-bold tabular-nums',
          pct > 50 ? 'text-emerald' : pct > 20 ? 'text-gold' : 'text-danger',
          animate && 'animate-score-pop'
        )}
      >
        {pct}
      </span>
    </div>
  );
}

// ─── Autocomplete Input ───────────────────────────────────────

function AutocompleteInput({
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
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 200);
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
      <input
        ref={inputRef}
        className="w-full rounded-lg border border-muted/30 bg-card px-4 py-3 text-sm text-text placeholder:text-muted/60 outline-none transition focus:border-emerald"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        disabled={disabled}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-10 mt-1 w-full overflow-hidden rounded-lg border border-muted/20 bg-card shadow-lg">
          {suggestions.map((name, idx) => (
            <button
              key={name}
              className={cn(
                'w-full cursor-pointer px-4 py-2.5 text-left text-sm transition',
                idx === selectedIdx
                  ? 'bg-emerald/20 text-emerald'
                  : 'text-text hover:bg-card-hover'
              )}
              onMouseDown={() => handleSelect(name)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Guess List ───────────────────────────────────────────────

function GuessList({
  guesses,
  penaltyLabel = '-5',
}: {
  guesses: { text: string; correct: boolean; count?: number }[];
  penaltyLabel?: string;
}) {
  if (guesses.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {guesses.map((g, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
            g.correct ? 'bg-emerald/15 text-emerald' : 'bg-danger/10 text-danger',
            i === guesses.length - 1 && !g.correct && 'animate-shake'
          )}
        >
          <span>{g.correct ? '✓' : '✗'}</span>
          <span className={cn(!g.correct && 'line-through')}>{g.text}</span>
          {g.correct && g.count && g.count > 1 && (
            <span className="ml-auto text-xs text-emerald">x{g.count} filled</span>
          )}
          {!g.correct && <span className="ml-auto text-xs text-muted">{penaltyLabel}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Leaderboard ──────────────────────────────────────────────

function Leaderboard({
  entries,
  currentUser,
}: {
  entries: LeaderboardEntry[];
  currentUser: string;
}) {
  if (entries.length === 0) {
    return <p className="text-center text-sm text-muted">No scores yet. Be the first!</p>;
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-muted/20">
      <div className="bg-card px-4 py-2.5">
        <h3 className="text-sm font-bold text-gold">Leaderboard</h3>
      </div>
      {entries.map((entry, idx) => (
        <div
          key={entry.username}
          className={cn(
            'flex items-center justify-between border-t border-muted/10 px-4 py-2.5',
            entry.username === currentUser && 'bg-emerald/10'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                idx === 0
                  ? 'bg-gold text-navy'
                  : idx === 1
                    ? 'bg-muted/40 text-text'
                    : idx === 2
                      ? 'bg-amber-800 text-text'
                      : 'bg-card text-muted'
              )}
            >
              {idx + 1}
            </span>
            <span
              className={cn(
                'text-sm',
                entry.username === currentUser ? 'font-bold text-emerald' : 'text-text'
              )}
            >
              {entry.username}
            </span>
          </div>
          <span className="text-sm font-bold tabular-nums text-gold">{entry.score}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Solved Screen ────────────────────────────────────────────

function SolvedScreen({
  playerName,
  clubs,
  score,
  leaderboard,
  currentUser,
  onPlayAgain,
}: {
  playerName: string;
  clubs: Club[];
  score: number;
  leaderboard: LeaderboardEntry[];
  currentUser: string;
  onPlayAgain?: () => void;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-1">
        <span className="text-3xl">🎉</span>
        <h2 className="text-xl font-black text-emerald">Solved!</h2>
        <p className="text-2xl font-bold text-text">{playerName}</p>
      </div>

      <div className="w-full rounded-xl bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Full Transfer History
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {clubs.map((club, i) => (
            <div key={i} className="flex items-center gap-1">
              <ClubCircle
                primaryColor={club.primaryColor}
                secondaryColor={club.secondaryColor}
                size={28}
              />
              <span className="text-xs text-text">{club.name}</span>
              {i < clubs.length - 1 && <span className="mx-1 text-muted/40">→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full items-center justify-between rounded-xl bg-card p-4">
        <span className="text-sm text-muted">Your Score</span>
        <span
          className={cn(
            'text-2xl font-black tabular-nums',
            score > 50 ? 'text-emerald' : score > 20 ? 'text-gold' : 'text-danger'
          )}
        >
          {score}
        </span>
      </div>

      <Leaderboard entries={leaderboard} currentUser={currentUser} />

      {onPlayAgain && (
        <button
          className="w-full rounded-xl bg-emerald px-6 py-3 text-sm font-bold text-navy transition hover:brightness-110 active:scale-95"
          onClick={onPlayAgain}
        >
          Play Again
        </button>
      )}
    </div>
  );
}

// ─── Mode 1: Guess the Player ─────────────────────────────────

function GuessPlayerMode({
  initData,
  onSolved,
}: {
  initData: InitData;
  onSolved: () => void;
}) {
  const [state, setState] = useState(initData.state);
  const [clues, setClues] = useState(initData.clues);
  const [currentHintCost, setCurrentHintCost] = useState(initData.hintCost);
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean }[]>([]);
  const [scoreAnimate, setScoreAnimate] = useState(false);
  const [animateClubIdx, setAnimateClubIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.mode !== 'guess-player') return null;

  const clubItems = (clues as Club[]).map((club, i) => ({
    index: i,
    club,
    revealed: true,
  }));

  const unrevealed = state.totalClubs - state.revealedClubIndices.length;
  for (let i = 0; i < unrevealed; i++) {
    clubItems.push({
      index: state.revealedClubIndices.length + i,
      club: null,
      revealed: false,
    });
  }

  const handleGuess = async (guess: string) => {
    setLoading(true);
    const result = await trpc.game.guessPlayer.mutate({ guess });
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    setGuesses((prev) => [...prev, { text: guess, correct: result.correct }]);
    if (!result.correct) {
      setScoreAnimate(true);
      setTimeout(() => setScoreAnimate(false), 400);
    }
    if (result.correct) {
      onSolved();
    }
    setLoading(false);
  };

  const handleReveal = async () => {
    setLoading(true);
    const result = await trpc.game.revealClub.mutate();
    setState(result.state);
    setClues(result.clues);
    setCurrentHintCost(result.hintCost);
    const newIdx = result.state.revealedClubIndices[result.state.revealedClubIndices.length - 1];
    setAnimateClubIdx(newIdx);
    setScoreAnimate(true);
    setTimeout(() => {
      setAnimateClubIdx(null);
      setScoreAnimate(false);
    }, 700);
    setLoading(false);
  };

  const handleGiveUp = async () => {
    setLoading(true);
    await trpc.game.giveUp.mutate();
    onSolved();
    setLoading(false);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-text">Who is this player?</h2>
        <p className="text-xs text-muted">Guess the footballer from their transfer history</p>
      </div>

      <div className="w-full rounded-xl bg-card p-4">
        <TransferRoute
          clubs={clubItems}
          animateIndex={animateClubIdx}
        />
      </div>

      <div className="w-full">
        <ScoreBar score={state.score} animate={scoreAnimate} />
      </div>

      <AutocompleteInput
        placeholder="Type player name..."
        searchFn={(q) => trpc.search.players.query({ query: q })}
        onSubmit={handleGuess}
        disabled={loading || state.solved}
      />

      <GuessList guesses={guesses} />

      <div className="flex w-full gap-2">
        <button
          className={cn(
            'flex-1 rounded-lg border border-gold/30 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/10',
            (loading || unrevealed === 0) && 'cursor-not-allowed opacity-40'
          )}
          onClick={handleReveal}
          disabled={loading || unrevealed === 0}
        >
          Reveal Club (-{currentHintCost})
        </button>
        <button
          className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
          onClick={handleGiveUp}
          disabled={loading}
        >
          Give Up
        </button>
      </div>
    </div>
  );
}

// ─── Mode 2: Predict Transfer Route ──────────────────────────

function PredictTransfersMode({
  initData,
  onSolved,
}: {
  initData: InitData;
  onSolved: () => void;
}) {
  const [state, setState] = useState(initData.state);
  const [clues, setClues] = useState(initData.clues);
  const [guesses, setGuesses] = useState<{ text: string; correct: boolean; count?: number }[]>([]);
  const [scoreAnimate, setScoreAnimate] = useState(false);
  const [animateClubIdx, setAnimateClubIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  if (state.mode !== 'predict-transfers') return null;

  type ClueItem = { index: number; club: Club | null; revealed: boolean };
  const clubItems = (clues as ClueItem[]).map((item) => ({
    ...item,
    revealed: item.revealed || state.guessedClubIndices.includes(item.index),
  }));

  const unguessedCount = state.hiddenClubIndices.filter(
    (i) => !state.guessedClubIndices.includes(i)
  ).length;

  const handleGuess = async (clubName: string) => {
    setLoading(true);
    const result = await trpc.game.guessTransferClub.mutate({ clubName });
    setState(result.state);
    setClues(result.clues);

    if (result.correct) {
      setGuesses((prev) => [
        ...prev,
        {
          text: clubName,
          correct: true,
          count: result.matchedIndices.length,
        },
      ]);
      if (result.matchedIndices.length > 0) {
        setAnimateClubIdx(result.matchedIndices[0]);
        setTimeout(() => setAnimateClubIdx(null), 700);
      }
    } else {
      setGuesses((prev) => [...prev, { text: clubName, correct: false }]);
      setScoreAnimate(true);
      setTimeout(() => setScoreAnimate(false), 400);
    }

    if (result.state.solved) {
      onSolved();
    }
    setLoading(false);
  };

  const handleRevealHint = async () => {
    setLoading(true);
    const result = await trpc.game.revealTransferHint.mutate();
    setState(result.state);
    setClues(result.clues);
    if (result.revealedIndex !== null) {
      setAnimateClubIdx(result.revealedIndex);
      setScoreAnimate(true);
      setTimeout(() => {
        setAnimateClubIdx(null);
        setScoreAnimate(false);
      }, 700);
    }
    if (result.state.solved) {
      onSolved();
    }
    setLoading(false);
  };

  const handleGiveUp = async () => {
    setLoading(true);
    await trpc.game.giveUp.mutate();
    onSolved();
    setLoading(false);
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-lg font-bold text-text">
          Complete the transfer route
        </h2>
        <p className="text-sm font-semibold text-emerald">{state.playerName}</p>
        <p className="text-xs text-muted">
          Fill in the missing clubs ({unguessedCount} remaining)
        </p>
      </div>

      <div className="w-full rounded-xl bg-card p-4">
        <TransferRoute clubs={clubItems} animateIndex={animateClubIdx} />
      </div>

      <div className="w-full">
        <ScoreBar score={state.score} animate={scoreAnimate} />
      </div>

      {unguessedCount > 0 && (
        <AutocompleteInput
          placeholder="Type club name..."
          searchFn={(q) => trpc.search.clubs.query({ query: q })}
          onSubmit={handleGuess}
          disabled={loading || state.solved}
        />
      )}

      <GuessList guesses={guesses} penaltyLabel="-10" />

      <div className="flex w-full gap-2">
        <button
          className={cn(
            'flex-1 rounded-lg border border-gold/30 px-4 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/10',
            (loading || unguessedCount === 0) && 'cursor-not-allowed opacity-40'
          )}
          onClick={handleRevealHint}
          disabled={loading || unguessedCount === 0}
        >
          Reveal Hint (-20)
        </button>
        <button
          className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/10"
          onClick={handleGiveUp}
          disabled={loading}
        >
          Give Up
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────

export const App = () => {
  const [initData, setInitData] = useState<InitData | null>(null);
  const [solved, setSolved] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [solvedData, setSolvedData] = useState<{
    playerName: string;
    clubs: Club[];
    score: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await trpc.init.get.query();
        setInitData(data);
        if (data.state.solved) {
          setSolved(true);
          await loadSolvedData();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load game');
      }
    };
    void load();
  }, []);

  const loadSolvedData = async () => {
    try {
      const [freshInit, lb] = await Promise.all([
        trpc.init.get.query(),
        trpc.leaderboard.get.query(),
      ]);
      setSolvedData({
        playerName: freshInit.playerName,
        clubs: freshInit.fullClubs ?? [],
        score: freshInit.state.score,
      });
      setLeaderboard(lb);
      setInitData(freshInit);
    } catch {
      // leaderboard fetch failed silently
    }
  };

  const handleSolved = () => {
    setSolved(true);
    void loadSolvedData();
  };

  const handlePlayAgain = async () => {
    await trpc.game.reset.mutate();
    setSolved(false);
    setSolvedData(null);
    setLeaderboard([]);
    const data = await trpc.init.get.query();
    setInitData(data);
  };

  if (error) {
    return (
      <div className="flex min-h-full items-center justify-center bg-navy px-4">
        <div className="rounded-xl bg-card p-6 text-center">
          <p className="text-danger text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!initData) {
    return (
      <div className="flex min-h-full items-center justify-center bg-navy">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
          <p className="text-sm text-muted">Loading game...</p>
        </div>
      </div>
    );
  }

  if (solved && solvedData) {
    return (
      <div className="flex min-h-full items-center justify-center bg-navy px-4 py-6">
        <SolvedScreen
          playerName={solvedData.playerName}
          clubs={solvedData.clubs}
          score={solvedData.score}
          leaderboard={leaderboard}
          currentUser={initData.username ?? ''}
          onPlayAgain={handlePlayAgain}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-navy px-4 py-6">
      {initData.state.mode === 'guess-player' ? (
        <GuessPlayerMode initData={initData} onSolved={handleSolved} />
      ) : (
        <PredictTransfersMode initData={initData} onSolved={handleSolved} />
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
