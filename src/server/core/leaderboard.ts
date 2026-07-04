import { redis } from '@devvit/web/server';
import { getTodayUtc } from '../../shared/scoring';
import type { LeaderboardEntry } from '../../shared/types';

const GLOBAL_LEADERBOARD_KEY = 'leaderboard:global';
const GLOBAL_DATA_PREFIX = 'leaderboard:global:data:';
const DAILY_DATA_PREFIX = 'leaderboard:daily:data:';

function dailyLeaderboardKey(date: string = getTodayUtc()) {
  return `leaderboard:daily:${date}`;
}

function dailyDataKey(username: string, date: string = getTodayUtc()) {
  return `${DAILY_DATA_PREFIX}${date}:${username}`;
}

function globalDataKey(username: string) {
  return `${GLOBAL_DATA_PREFIX}${username}`;
}

type StoredLeaderboardEntry = {
  username: string;
  score: number;
  streak: number;
  updatedAt: number;
};

function withRankAndPercentage(
  entries: StoredLeaderboardEntry[],
  limit: number
): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, limit);
  const topScore = sorted[0]?.score ?? 0;

  return sorted.map((entry, index) => ({
    username: entry.username,
    score: entry.score,
    rank: index + 1,
    percentage: topScore > 0 ? Math.round((entry.score / topScore) * 1000) / 10 : 0,
    streak: entry.streak,
  }));
}

export async function addToGlobalLeaderboard(
  username: string,
  score: number,
  streak: number
): Promise<void> {
  const entry: StoredLeaderboardEntry = {
    username,
    score,
    streak,
    updatedAt: Date.now(),
  };

  await redis.zAdd(GLOBAL_LEADERBOARD_KEY, { member: username, score });
  await redis.set(globalDataKey(username), JSON.stringify(entry));
}

export async function addToDailyLeaderboard(
  username: string,
  score: number,
  streak: number,
  date: string = getTodayUtc()
): Promise<void> {
  const entry: StoredLeaderboardEntry = {
    username,
    score,
    streak,
    updatedAt: Date.now(),
  };

  await redis.zAdd(dailyLeaderboardKey(date), { member: username, score });
  await redis.set(dailyDataKey(username, date), JSON.stringify(entry));
}

async function loadEntriesFromZset(
  key: string,
  dataKeyFn: (username: string) => string,
  limit: number
): Promise<StoredLeaderboardEntry[]> {
  const members = await redis.zRange(key, 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const entries: StoredLeaderboardEntry[] = [];
  for (const member of members) {
    const data = await redis.get(dataKeyFn(member.member));
    if (data) {
      entries.push(JSON.parse(data) as StoredLeaderboardEntry);
    }
  }

  return entries;
}

export async function getGlobalLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const entries = await loadEntriesFromZset(
    GLOBAL_LEADERBOARD_KEY,
    globalDataKey,
    limit
  );
  return withRankAndPercentage(entries, limit);
}

export async function getDailyLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const entries = await loadEntriesFromZset(
    dailyLeaderboardKey(),
    (username) => dailyDataKey(username),
    limit
  );
  return withRankAndPercentage(entries, limit);
}

export async function getUserGlobalEntry(username: string): Promise<LeaderboardEntry | null> {
  const data = await redis.get(globalDataKey(username));
  if (!data) return null;

  const entry = JSON.parse(data) as StoredLeaderboardEntry;
  const rank = await redis.zRank(GLOBAL_LEADERBOARD_KEY, username);
  const topMembers = await redis.zRange(GLOBAL_LEADERBOARD_KEY, 0, 0, {
    by: 'rank',
    reverse: true,
  });
  const topScore = topMembers[0]?.score ?? entry.score;

  return {
    username: entry.username,
    score: entry.score,
    rank: rank === undefined || rank === null ? 0 : rank + 1,
    percentage: topScore > 0 ? Math.round((entry.score / topScore) * 1000) / 10 : 0,
    streak: entry.streak,
  };
}

export async function getUserDailyEntry(username: string): Promise<LeaderboardEntry | null> {
  const data = await redis.get(dailyDataKey(username));
  if (!data) return null;

  const entry = JSON.parse(data) as StoredLeaderboardEntry;
  const rank = await redis.zRank(dailyLeaderboardKey(), username);
  const topMembers = await redis.zRange(dailyLeaderboardKey(), 0, 0, {
    by: 'rank',
    reverse: true,
  });
  const topScore = topMembers[0]?.score ?? entry.score;

  return {
    username: entry.username,
    score: entry.score,
    rank: rank === undefined || rank === null ? 0 : rank + 1,
    percentage: topScore > 0 ? Math.round((entry.score / topScore) * 1000) / 10 : 0,
    streak: entry.streak,
  };
}
