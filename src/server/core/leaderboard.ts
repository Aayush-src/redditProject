import { redis } from '@devvit/web/server';
import type { GameMode, LeaderboardEntry } from '../../shared/types';

function leaderboardKey(postId: string) {
  return `leaderboard:${postId}`;
}

function leaderboardDataKey(postId: string, username: string) {
  return `leaderboard:${postId}:data:${username}`;
}

export async function submitScore(
  postId: string,
  username: string,
  score: number,
  mode: GameMode
): Promise<void> {
  const entry: LeaderboardEntry = {
    username,
    score,
    mode,
    solvedAt: Date.now(),
  };

  await redis.zAdd(leaderboardKey(postId), {
    member: username,
    score,
  });
  await redis.set(leaderboardDataKey(postId, username), JSON.stringify(entry));
}

export async function getLeaderboard(
  postId: string,
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const members = await redis.zRange(leaderboardKey(postId), 0, limit - 1, {
    by: 'rank',
    reverse: true,
  });

  const entries: LeaderboardEntry[] = [];
  for (const member of members) {
    const data = await redis.get(leaderboardDataKey(postId, member.member));
    if (data) {
      entries.push(JSON.parse(data) as LeaderboardEntry);
    }
  }

  return entries;
}

export async function getUserScore(
  postId: string,
  username: string
): Promise<LeaderboardEntry | null> {
  const data = await redis.get(leaderboardDataKey(postId, username));
  if (!data) return null;
  return JSON.parse(data) as LeaderboardEntry;
}

export async function getUserRank(
  postId: string,
  username: string
): Promise<number | null> {
  const rank = await redis.zScore(leaderboardKey(postId), username);
  if (rank === undefined || rank === null) return null;
  return rank;
}
