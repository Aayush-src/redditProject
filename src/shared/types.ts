export type Club = {
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
};

export type Manager = {
  name: string;
  photo: string;
};

export type Jersey = {
  number: number;
  primaryColor: string;
  secondaryColor: string;
};

export type Player = {
  id: string;
  name: string;
  /** Flag emoji, e.g. 🇧🇪 */
  nationality: string;
  /** Country name for display, e.g. Belgium */
  country: string;
  /** Chronological order: first club joined → most recent */
  clubs: Club[];
  managers: Manager[];
  jerseys: Jersey[];
};

import type { WagerMultiplier } from './scoring';

export type GameMode = 'guess-player' | 'predict-transfers';

export type WagerState = {
  wager: WagerMultiplier;
  wagerLocked: boolean;
};

export type GuessPlayerState = WagerState & {
  mode: 'guess-player';
  playerId: string;
  /** Indices of clubs revealed so far (chronological) */
  revealedClubIndices: number[];
  revealedJerseyIndices: number[];
  revealedManagerIndices: number[];
  totalClubs: number;
  score: number;
  wrongGuesses: number;
  solved: boolean;
};

export type PredictTransfersState = WagerState & {
  mode: 'predict-transfers';
  playerId: string;
  playerName: string;
  /** Indices of clubs shown from the start */
  shownClubIndices: number[];
  /** Indices of clubs the user must guess */
  hiddenClubIndices: number[];
  /** Indices of hidden clubs the user has correctly guessed */
  guessedClubIndices: number[];
  totalClubs: number;
  score: number;
  wrongGuesses: number;
  solved: boolean;
};

export type GameState = GuessPlayerState | PredictTransfersState;

export type PlayerProfile = {
  totalPoints: number;
  streak: number;
  dailyScore: number;
  dailyAllowanceClaimed: boolean;
};

export type RoundEarnings = {
  wagerEarnings: number;
  streakBonus: number;
  dailyAllowance: number;
  totalEarned: number;
};

export type LeaderboardEntry = {
  username: string;
  score: number;
  rank: number;
  percentage: number;
  streak?: number;
};
