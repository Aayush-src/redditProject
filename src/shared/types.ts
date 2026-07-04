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
  nationality: string;
  /** Chronological order: first club joined → most recent */
  clubs: Club[];
  managers: Manager[];
  jerseys: Jersey[];
};

export type GameMode = 'guess-player' | 'predict-transfers';

export type GuessPlayerState = {
  mode: 'guess-player';
  playerId: string;
  /** Indices of clubs revealed so far (chronological) */
  revealedClubIndices: number[];
  totalClubs: number;
  score: number;
  wrongGuesses: number;
  solved: boolean;
};

export type PredictTransfersState = {
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

export type LeaderboardEntry = {
  username: string;
  score: number;
  mode: GameMode;
  solvedAt: number;
};
