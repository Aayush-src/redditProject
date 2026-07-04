export const WAGER_OPTIONS = [1, 1.25, 1.5, 1.75, 2] as const;

export type WagerMultiplier = (typeof WAGER_OPTIONS)[number];

export const BASE_TOTAL_POINTS = 1000;
export const DAILY_ALLOWANCE = 100;
export const INITIAL_ROUND_SCORE = 100;
export const WRONG_GUESS_PENALTY_GUESS_PLAYER = 5;
export const WRONG_GUESS_PENALTY_PREDICT = 10;
export const JERSEY_HINT_COST = 15;
export const MANAGER_HINT_COST = 15;
export const STREAK_BONUS_PER_DAY = 5;
export const STREAK_BONUS_MAX_DAYS = 7;
export const STREAK_RESET_INACTIVE_DAYS = 30;

export function getTodayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetweenUtc(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00Z`).getTime();
  const end = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

export function getStreakBonus(streak: number): number {
  return Math.min(streak, STREAK_BONUS_MAX_DAYS) * STREAK_BONUS_PER_DAY;
}

export function scaledPenalty(basePenalty: number, wager: WagerMultiplier): number {
  return Math.round(basePenalty * wager * 100) / 100;
}

export function calculateWagerEarnings(roundScore: number, wager: WagerMultiplier): number {
  return Math.round(roundScore * wager * 100) / 100;
}

export function isValidWager(value: number): value is WagerMultiplier {
  return WAGER_OPTIONS.some((option) => option === value);
}
