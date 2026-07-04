import { calculateWagerEarnings } from '../../shared/scoring';
import type { GameState, RoundEarnings } from '../../shared/types';
import {
  claimDailyAllowance,
  getOrCreatePlayerProfile,
  recordRoundEarnings,
  updateStreakOnSolve,
} from './player';

export async function processSolveRewards(
  username: string,
  state: GameState
): Promise<{ profile: Awaited<ReturnType<typeof getOrCreatePlayerProfile>>; earnings: RoundEarnings }> {
  const dailyAllowance = await claimDailyAllowance(username);
  const { bonus: streakBonus } = await updateStreakOnSolve(username);
  const wagerEarnings = calculateWagerEarnings(state.score, state.wager);

  const earnings = await recordRoundEarnings(username, wagerEarnings, streakBonus);
  earnings.dailyAllowance = dailyAllowance;

  const profile = await getOrCreatePlayerProfile(username);
  return { profile, earnings };
}

export async function ensureDailyAllowance(username: string): Promise<void> {
  await claimDailyAllowance(username);
}
