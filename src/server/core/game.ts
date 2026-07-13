import { redis } from '@devvit/web/server';
import type {
  Club,
  GameMode,
  GameState,
  GuessPlayerState,
  Jersey,
  Manager,
  PredictTransfersState,
} from '../../shared/types';
import type { WagerMultiplier } from '../../shared/scoring';
import {
  INITIAL_ROUND_SCORE,
  JERSEY_HINT_COST,
  MANAGER_HINT_COST,
  WRONG_GUESS_PENALTY_GUESS_PLAYER,
  WRONG_GUESS_PENALTY_PREDICT,
  isValidWager,
  scaledPenalty,
} from '../../shared/scoring';
import { players } from './players';

const INITIAL_CLUBS_REVEALED = 2;
const HINT_BUDGET = 80;

function hintCost(totalHintableClubs: number): number {
  if (totalHintableClubs <= 0) return 0;
  return Math.ceil(HINT_BUDGET / totalHintableClubs);
}

function redisKey(postId: string, username: string) {
  return `game:${postId}:${username}`;
}

function postModeKey(postId: string) {
  return `game:${postId}:mode`;
}

function postPlayerKey(postId: string) {
  return `game:${postId}:player`;
}

function clampScore(score: number): number {
  return Math.max(0, score);
}

function defaultWagerState() {
  return { wager: 1 as WagerMultiplier, wagerLocked: false };
}

function normalizeGameState(state: GameState): GameState {
  const wager = isValidWager(state.wager) ? state.wager : 1;
  return {
    ...state,
    wager,
    wagerLocked: state.wagerLocked ?? false,
  };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = indices[i] as number;
    indices[i] = indices[j] as number;
    indices[j] = tmp;
  }
  return indices;
}

export async function initGameForPost(postId: string): Promise<{ mode: GameMode; playerId: string }> {
  const existing = await redis.get(postModeKey(postId));
  if (existing) {
    const playerId = (await redis.get(postPlayerKey(postId))) ?? '';
    return { mode: existing as GameMode, playerId };
  }

  const mode: GameMode = Math.random() < 0.5 ? 'guess-player' : 'predict-transfers';
  const player = pickRandom(players);

  await redis.set(postModeKey(postId), mode);
  await redis.set(postPlayerKey(postId), player.id);

  return { mode, playerId: player.id };
}

export async function getOrCreateGameState(
  postId: string,
  username: string
): Promise<GameState> {
  const saved = await redis.get(redisKey(postId, username));
  if (saved) {
    return normalizeGameState(JSON.parse(saved) as GameState);
  }

  const { mode, playerId } = await initGameForPost(postId);
  const player = players.find((p) => p.id === playerId);
  if (!player) throw new Error('Player not found');

  let state: GameState;

  if (mode === 'guess-player') {
    const initialRevealed = Math.min(INITIAL_CLUBS_REVEALED, player.clubs.length);
    const revealedClubIndices = Array.from({ length: initialRevealed }, (_, i) => i);
    state = {
      mode: 'guess-player',
      playerId: player.id,
      revealedClubIndices,
      revealedJerseyIndices: [],
      revealedManagerIndices: [],
      totalClubs: player.clubs.length,
      score: INITIAL_ROUND_SCORE,
      wrongGuesses: 0,
      solved: false,
      ...defaultWagerState(),
    };
  } else {
    const totalClubs = player.clubs.length;
    const halfCount = Math.max(1, Math.ceil(totalClubs / 2));
    const shuffled = shuffleIndices(totalClubs);
    const shownClubIndices = shuffled.slice(0, halfCount).sort((a, b) => a - b);
    const hiddenClubIndices = shuffled.slice(halfCount).sort((a, b) => a - b);

    state = {
      mode: 'predict-transfers',
      playerId: player.id,
      playerName: player.name,
      shownClubIndices,
      hiddenClubIndices,
      guessedClubIndices: [],
      totalClubs,
      score: INITIAL_ROUND_SCORE,
      wrongGuesses: 0,
      solved: false,
      ...defaultWagerState(),
    };
  }

  await redis.set(redisKey(postId, username), JSON.stringify(state));
  return state;
}

async function saveState(postId: string, username: string, state: GameState) {
  await redis.set(redisKey(postId, username), JSON.stringify(state));
}

export async function setWager(
  postId: string,
  username: string,
  wager: WagerMultiplier
): Promise<GameState> {
  const state = await getOrCreateGameState(postId, username);
  if (state.solved) throw new Error('Game already solved');
  if (state.wagerLocked) throw new Error('Wager is locked');

  state.wager = wager;
  await saveState(postId, username, state);
  return state;
}

function applyPenalty(state: GameState, basePenalty: number) {
  const penalty = scaledPenalty(basePenalty, state.wager);
  state.score = clampScore(state.score - penalty);
  return penalty;
}

export async function guessPlayer(
  postId: string,
  username: string,
  guess: string
): Promise<{ correct: boolean; state: GuessPlayerState; playerName?: string; penalty?: number }> {
  const state = await getOrCreateGameState(postId, username);
  if (state.mode !== 'guess-player') throw new Error('Wrong game mode');
  if (state.solved) return { correct: true, state, playerName: players.find((p) => p.id === state.playerId)?.name };

  const player = players.find((p) => p.id === state.playerId);
  if (!player) throw new Error('Player not found');

  const normalizedGuess = guess.trim().toLowerCase();
  const normalizedName = player.name.toLowerCase();

  const correct =
    normalizedGuess === normalizedName ||
    normalizedName.includes(normalizedGuess) && normalizedGuess.length >= 4;

  if (correct) {
    state.solved = true;
    state.wagerLocked = true;
    await saveState(postId, username, state);
    return { correct: true, state, playerName: player.name };
  }

  state.wrongGuesses += 1;
  state.wagerLocked = true;
  const penalty = applyPenalty(state, WRONG_GUESS_PENALTY_GUESS_PLAYER);
  await saveState(postId, username, state);
  return { correct: false, state, penalty };
}

export async function revealClub(
  postId: string,
  username: string
): Promise<{ club: Club | null; cost: number; state: GuessPlayerState }> {
  const state = await getOrCreateGameState(postId, username);
  if (state.mode !== 'guess-player') throw new Error('Wrong game mode');
  if (state.solved) return { club: null, cost: 0, state };

  const player = players.find((p) => p.id === state.playerId);
  if (!player) throw new Error('Player not found');

  const nextIndex = state.revealedClubIndices.length;
  if (nextIndex >= player.clubs.length) {
    return { club: null, cost: 0, state };
  }

  const totalHintable = player.clubs.length - INITIAL_CLUBS_REVEALED;
  const remaining = player.clubs.length - nextIndex;
  const cost = hintCost(Math.max(totalHintable, remaining));

  state.revealedClubIndices.push(nextIndex);
  const penalty = applyPenalty(state, cost);
  await saveState(postId, username, state);
  const club = player.clubs[nextIndex] ?? null;
  return { club, cost: penalty, state };
}

export async function guessTransferClub(
  postId: string,
  username: string,
  clubName: string
): Promise<{ correct: boolean; matchedIndices: number[]; state: PredictTransfersState; penalty?: number }> {
  const state = await getOrCreateGameState(postId, username);
  if (state.mode !== 'predict-transfers') throw new Error('Wrong game mode');
  if (state.solved) return { correct: true, matchedIndices: [], state };

  const player = players.find((p) => p.id === state.playerId);
  if (!player) throw new Error('Player not found');

  const normalizedGuess = clubName.trim().toLowerCase();

  const unguessedHidden = state.hiddenClubIndices.filter(
    (i) => !state.guessedClubIndices.includes(i)
  );

  const matchedIndices: number[] = [];
  for (const idx of unguessedHidden) {
    const clubEntry = player.clubs[idx];
    if (!clubEntry) continue;
    const actualName = clubEntry.name.toLowerCase();
    if (
      normalizedGuess === actualName ||
      (actualName.includes(normalizedGuess) && normalizedGuess.length >= 3)
    ) {
      matchedIndices.push(idx);
    }
  }

  if (matchedIndices.length > 0) {
    for (const idx of matchedIndices) {
      if (!state.guessedClubIndices.includes(idx)) {
        state.guessedClubIndices.push(idx);
      }
    }
    const allGuessed = state.hiddenClubIndices.every((i) =>
      state.guessedClubIndices.includes(i)
    );
    if (allGuessed) {
      state.solved = true;
      state.wagerLocked = true;
    }
    await saveState(postId, username, state);
    return { correct: true, matchedIndices, state };
  }

  state.wrongGuesses += 1;
  state.wagerLocked = true;
  const penalty = applyPenalty(state, WRONG_GUESS_PENALTY_PREDICT);
  await saveState(postId, username, state);
  return { correct: false, matchedIndices: [], state, penalty };
}

export async function revealTransferHint(
  postId: string,
  username: string
): Promise<{ revealedIndex: number | null; club: Club | null; cost: number; state: PredictTransfersState }> {
  const state = await getOrCreateGameState(postId, username);
  if (state.mode !== 'predict-transfers') throw new Error('Wrong game mode');
  if (state.solved) return { revealedIndex: null, club: null, cost: 0, state };

  const player = players.find((p) => p.id === state.playerId);
  if (!player) throw new Error('Player not found');

  const unguessed = state.hiddenClubIndices.filter(
    (i) => !state.guessedClubIndices.includes(i)
  );

  if (unguessed.length === 0) {
    return { revealedIndex: null, club: null, cost: 0, state };
  }

  const cost = hintCost(state.hiddenClubIndices.length);

  const revealIndex = unguessed[0] as number;
  state.guessedClubIndices.push(revealIndex);
  const penalty = applyPenalty(state, cost);

  const allGuessed = state.hiddenClubIndices.every((i) =>
    state.guessedClubIndices.includes(i)
  );
  if (allGuessed) {
    state.solved = true;
    state.wagerLocked = true;
  }

  await saveState(postId, username, state);
  const revealedClub = player.clubs[revealIndex] ?? null;
  return { revealedIndex: revealIndex, club: revealedClub, cost: penalty, state };
}

export function getRevealedClubs(state: GuessPlayerState) {
  const player = players.find((p) => p.id === state.playerId);
  if (!player) return [];
  return state.revealedClubIndices.map((i) => player.clubs[i]);
}

export function getVisibleTransferRoute(state: PredictTransfersState) {
  const player = players.find((p) => p.id === state.playerId);
  if (!player) return [];

  return player.clubs.map((club, index) => {
    const isShown = state.shownClubIndices.includes(index);
    const isGuessed = state.guessedClubIndices.includes(index);
    if (isShown || isGuessed) {
      return { index, club, revealed: true };
    }
    return { index, club: null, revealed: false };
  });
}

export function getAllClubNames(): string[] {
  const clubSet = new Set<string>();
  for (const player of players) {
    for (const club of player.clubs) {
      clubSet.add(club.name);
    }
  }
  return Array.from(clubSet).sort();
}

export function getAllPlayerNames(): string[] {
  return players.map((p) => p.name).sort();
}

export function searchClubs(query: string): string[] {
  if (!query || query.length < 2) return [];
  const normalized = query.toLowerCase();
  return getAllClubNames().filter((name) =>
    name.toLowerCase().includes(normalized)
  );
}

export function searchPlayers(query: string): string[] {
  if (!query || query.length < 2) return [];
  const normalized = query.toLowerCase();
  return getAllPlayerNames().filter((name) =>
    name.toLowerCase().includes(normalized)
  );
}

export function getHintCost(state: GameState): number {
  const player = players.find((p) => p.id === state.playerId);
  if (!player) return 0;

  if (state.mode === 'guess-player') {
    const totalHintable = player.clubs.length - INITIAL_CLUBS_REVEALED;
    const remaining = player.clubs.length - state.revealedClubIndices.length;
    if (remaining <= 0) return 0;
    return scaledPenalty(hintCost(Math.max(totalHintable, remaining)), state.wager);
  }

  const unguessed = state.hiddenClubIndices.filter(
    (i) => !state.guessedClubIndices.includes(i)
  );
  if (unguessed.length === 0) return 0;
  return scaledPenalty(hintCost(state.hiddenClubIndices.length), state.wager);
}

export function getJerseyHintCost(state: GameState): number {
  return scaledPenalty(JERSEY_HINT_COST, state.wager);
}

export function getManagerHintCost(state: GameState): number {
  return scaledPenalty(MANAGER_HINT_COST, state.wager);
}

export function getFullPlayerClubs(playerId: string): Club[] {
  const player = players.find((p) => p.id === playerId);
  if (!player) return [];
  return player.clubs;
}

export function getPlayerName(playerId: string): string {
  const player = players.find((p) => p.id === playerId);
  return player?.name ?? 'Unknown';
}

export function getPlayerNationality(playerId: string): string {
  const player = players.find((p) => p.id === playerId);
  return player?.country ?? '';
}

export function getPlayerFlag(playerId: string): string {
  const player = players.find((p) => p.id === playerId);
  return player?.nationality ?? '⚽';
}

export async function revealJersey(
  postId: string,
  username: string
): Promise<{ jersey: Jersey | null; cost: number; state: GuessPlayerState }> {
  const state = await getOrCreateGameState(postId, username);
  if (state.mode !== 'guess-player') throw new Error('Wrong game mode');
  if (state.solved) return { jersey: null, cost: 0, state };

  const player = players.find((p) => p.id === state.playerId);
  if (!player) throw new Error('Player not found');

  const indices = state.revealedJerseyIndices ?? [];
  const nextIndex = indices.length;
  if (nextIndex >= player.jerseys.length) return { jersey: null, cost: 0, state };

  if (!state.revealedJerseyIndices) state.revealedJerseyIndices = [];
  state.revealedJerseyIndices.push(nextIndex);
  const penalty = applyPenalty(state, JERSEY_HINT_COST);
  await saveState(postId, username, state);
  return { jersey: player.jerseys[nextIndex] ?? null, cost: penalty, state };
}

export async function revealManager(
  postId: string,
  username: string
): Promise<{ manager: Manager | null; cost: number; state: GuessPlayerState }> {
  const state = await getOrCreateGameState(postId, username);
  if (state.mode !== 'guess-player') throw new Error('Wrong game mode');
  if (state.solved) return { manager: null, cost: 0, state };

  const player = players.find((p) => p.id === state.playerId);
  if (!player) throw new Error('Player not found');

  const indices = state.revealedManagerIndices ?? [];
  const nextIndex = indices.length;
  if (nextIndex >= player.managers.length) return { manager: null, cost: 0, state };

  if (!state.revealedManagerIndices) state.revealedManagerIndices = [];
  state.revealedManagerIndices.push(nextIndex);
  const penalty = applyPenalty(state, MANAGER_HINT_COST);
  await saveState(postId, username, state);
  return { manager: player.managers[nextIndex] ?? null, cost: penalty, state };
}

export function getRevealedJerseys(state: GuessPlayerState): Jersey[] {
  const player = players.find((p) => p.id === state.playerId);
  if (!player) return [];
  return (state.revealedJerseyIndices ?? [])
    .map((i) => player.jerseys[i])
    .filter((j): j is Jersey => j !== undefined);
}

export function getRevealedManagers(state: GuessPlayerState): Manager[] {
  const player = players.find((p) => p.id === state.playerId);
  if (!player) return [];
  return (state.revealedManagerIndices ?? [])
    .map((i) => player.managers[i])
    .filter((m): m is Manager => m !== undefined);
}
