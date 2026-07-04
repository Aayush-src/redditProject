import { redis } from '@devvit/web/server';
import {
  BASE_TOTAL_POINTS,
  DAILY_ALLOWANCE,
  STREAK_RESET_INACTIVE_DAYS,
  daysBetweenUtc,
  getStreakBonus,
  getTodayUtc,
} from '../../shared/scoring';
import type { PlayerProfile, RoundEarnings } from '../../shared/types';
import { addToDailyLeaderboard, addToGlobalLeaderboard } from './leaderboard';

function playerKey(username: string) {
  return `player:${username}`;
}

type StoredPlayerProfile = {
  totalPoints: number;
  streak: number;
  lastSolveDate: string | null;
  lastPlayedDate: string | null;
  dailyAllowanceDate: string | null;
  dailyScoreDate: string | null;
  dailyScore: number;
};

function defaultStoredProfile(): StoredPlayerProfile {
  return {
    totalPoints: BASE_TOTAL_POINTS,
    streak: 0,
    lastSolveDate: null,
    lastPlayedDate: null,
    dailyAllowanceDate: null,
    dailyScoreDate: null,
    dailyScore: 0,
  };
}

async function loadStoredProfile(username: string): Promise<StoredPlayerProfile> {
  const saved = await redis.get(playerKey(username));
  if (!saved) return defaultStoredProfile();
  return { ...defaultStoredProfile(), ...(JSON.parse(saved) as StoredPlayerProfile) };
}

async function saveStoredProfile(username: string, profile: StoredPlayerProfile) {
  await redis.set(playerKey(username), JSON.stringify(profile));
}

function toPlayerProfile(profile: StoredPlayerProfile, today: string): PlayerProfile {
  const dailyScore = profile.dailyScoreDate === today ? profile.dailyScore : 0;
  return {
    totalPoints: profile.totalPoints,
    streak: profile.streak,
    dailyScore,
    dailyAllowanceClaimed: profile.dailyAllowanceDate === today,
  };
}

export async function getOrCreatePlayerProfile(username: string): Promise<PlayerProfile> {
  const today = getTodayUtc();
  const profile = await loadStoredProfile(username);
  return toPlayerProfile(profile, today);
}

export async function claimDailyAllowance(username: string): Promise<number> {
  const today = getTodayUtc();
  const profile = await loadStoredProfile(username);

  if (profile.dailyAllowanceDate === today) {
    return 0;
  }

  profile.dailyAllowanceDate = today;
  profile.lastPlayedDate = today;
  profile.totalPoints += DAILY_ALLOWANCE;

  if (profile.dailyScoreDate !== today) {
    profile.dailyScoreDate = today;
    profile.dailyScore = 0;
  }
  profile.dailyScore += DAILY_ALLOWANCE;

  await saveStoredProfile(username, profile);
  await addToGlobalLeaderboard(username, profile.totalPoints, profile.streak);
  await addToDailyLeaderboard(username, profile.dailyScore, profile.streak);

  return DAILY_ALLOWANCE;
}

export async function updateStreakOnSolve(username: string): Promise<{ streak: number; bonus: number }> {
  const today = getTodayUtc();
  const profile = await loadStoredProfile(username);

  if (profile.lastPlayedDate && daysBetweenUtc(profile.lastPlayedDate, today) >= STREAK_RESET_INACTIVE_DAYS) {
    profile.streak = 0;
  }

  if (profile.lastSolveDate === today) {
    await saveStoredProfile(username, profile);
    return { streak: profile.streak, bonus: 0 };
  }

  if (profile.lastSolveDate && daysBetweenUtc(profile.lastSolveDate, today) === 1) {
    profile.streak += 1;
  } else {
    profile.streak = 1;
  }

  profile.lastSolveDate = today;
  profile.lastPlayedDate = today;

  const bonus = getStreakBonus(profile.streak);
  await saveStoredProfile(username, profile);
  return { streak: profile.streak, bonus };
}

export async function recordRoundEarnings(
  username: string,
  wagerEarnings: number,
  streakBonus: number
): Promise<RoundEarnings> {
  const today = getTodayUtc();
  const profile = await loadStoredProfile(username);
  const earned = wagerEarnings + streakBonus;

  profile.totalPoints += earned;
  profile.lastPlayedDate = today;

  if (profile.dailyScoreDate !== today) {
    profile.dailyScoreDate = today;
    profile.dailyScore = 0;
  }
  profile.dailyScore += earned;

  await saveStoredProfile(username, profile);
  await addToGlobalLeaderboard(username, profile.totalPoints, profile.streak);
  await addToDailyLeaderboard(username, profile.dailyScore, profile.streak);

  return {
    wagerEarnings,
    streakBonus,
    dailyAllowance: 0,
    totalEarned: earned,
  };
}
