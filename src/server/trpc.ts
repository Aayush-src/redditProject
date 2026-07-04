import { initTRPC } from '@trpc/server';
import { transformer } from '../shared/transformer';
import { Context } from './context';
import { context, reddit, redis } from '@devvit/web/server';
import { z } from 'zod';
import {
  getOrCreateGameState,
  guessPlayer,
  revealClub,
  revealJersey,
  revealManager,
  guessTransferClub,
  revealTransferHint,
  getRevealedClubs,
  getRevealedJerseys,
  getRevealedManagers,
  getVisibleTransferRoute,
  getFullPlayerClubs,
  getPlayerName,
  getHintCost,
  getJerseyHintCost,
  getManagerHintCost,
  searchClubs,
  searchPlayers,
  setWager,
} from './core/game';
import {
  getGlobalLeaderboard,
  getDailyLeaderboard,
  getUserGlobalEntry,
  getUserDailyEntry,
} from './core/leaderboard';
import { getOrCreatePlayerProfile } from './core/player';
import { ensureDailyAllowance, processSolveRewards } from './core/rewards';
import { isValidWager } from '../shared/scoring';

const t = initTRPC.context<Context>().create({
  transformer,
});

function getPostId(): string {
  const { postId } = context;
  if (!postId) throw new Error('postId is required');
  return postId;
}

async function getUsername(): Promise<string> {
  const username = await reddit.getCurrentUsername();
  if (!username) throw new Error('User must be logged in');
  return username;
}

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  init: t.router({
    get: publicProcedure.query(async () => {
      const [username, postId] = await Promise.all([getUsername(), getPostId()]);

      await ensureDailyAllowance(username);
      const [state, profile] = await Promise.all([
        getOrCreateGameState(postId, username),
        getOrCreatePlayerProfile(username),
      ]);

      let clues;
      if (state.mode === 'guess-player') {
        clues = getRevealedClubs(state);
      } else {
        clues = getVisibleTransferRoute(state);
      }

      const fullClubs = state.solved ? getFullPlayerClubs(state.playerId) : null;
      const playerName = getPlayerName(state.playerId);
      const currentHintCost = getHintCost(state);
      const jerseyHintCost = getJerseyHintCost(state);
      const managerHintCost = getManagerHintCost(state);
      const revealedJerseys = state.mode === 'guess-player' ? getRevealedJerseys(state) : [];
      const revealedManagers = state.mode === 'guess-player' ? getRevealedManagers(state) : [];

      return {
        postId,
        username,
        state,
        clues,
        fullClubs,
        playerName,
        hintCost: currentHintCost,
        jerseyHintCost,
        managerHintCost,
        revealedJerseys,
        revealedManagers,
        profile,
      };
    }),
  }),

  game: t.router({
    setWager: publicProcedure
      .input(z.object({ wager: z.number() }))
      .mutation(async ({ input }) => {
        const username = await getUsername();
        const postId = getPostId();

        if (!isValidWager(input.wager)) {
          throw new Error('Invalid wager');
        }

        const state = await setWager(postId, username, input.wager);
        return {
          state,
          hintCost: getHintCost(state),
          jerseyHintCost: getJerseyHintCost(state),
          managerHintCost: getManagerHintCost(state),
        };
      }),

    guessPlayer: publicProcedure
      .input(z.object({ guess: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const username = await getUsername();
        const postId = getPostId();

        const result = await guessPlayer(postId, username, input.guess);

        let earnings = null;
        let profile = await getOrCreatePlayerProfile(username);

        if (result.correct) {
          const rewards = await processSolveRewards(username, result.state);
          earnings = rewards.earnings;
          profile = rewards.profile;
        }

        return {
          correct: result.correct,
          state: result.state,
          playerName: result.playerName,
          clues: getRevealedClubs(result.state),
          fullClubs: result.state.solved ? getFullPlayerClubs(result.state.playerId) : null,
          hintCost: getHintCost(result.state),
          jerseyHintCost: getJerseyHintCost(result.state),
          managerHintCost: getManagerHintCost(result.state),
          penalty: 'penalty' in result ? result.penalty : undefined,
          earnings,
          profile,
        };
      }),

    revealClub: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      const result = await revealClub(postId, username);
      let earnings = null;
      let profile = await getOrCreatePlayerProfile(username);

      if (result.state.solved) {
        const rewards = await processSolveRewards(username, result.state);
        earnings = rewards.earnings;
        profile = rewards.profile;
      }

      return {
        club: result.club,
        cost: result.cost,
        state: result.state,
        clues: getRevealedClubs(result.state),
        hintCost: getHintCost(result.state),
        jerseyHintCost: getJerseyHintCost(result.state),
        managerHintCost: getManagerHintCost(result.state),
        earnings,
        profile,
      };
    }),

    revealJersey: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();
      const result = await revealJersey(postId, username);
      return {
        jersey: result.jersey,
        cost: result.cost,
        state: result.state,
        clues: getRevealedClubs(result.state),
        hintCost: getHintCost(result.state),
        jerseyHintCost: getJerseyHintCost(result.state),
        managerHintCost: getManagerHintCost(result.state),
        revealedJerseys: getRevealedJerseys(result.state),
      };
    }),

    revealManager: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();
      const result = await revealManager(postId, username);
      return {
        manager: result.manager,
        cost: result.cost,
        state: result.state,
        clues: getRevealedClubs(result.state),
        hintCost: getHintCost(result.state),
        jerseyHintCost: getJerseyHintCost(result.state),
        managerHintCost: getManagerHintCost(result.state),
        revealedManagers: getRevealedManagers(result.state),
      };
    }),

    guessTransferClub: publicProcedure
      .input(
        z.object({
          clubName: z.string().min(1),
        })
      )
      .mutation(async ({ input }) => {
        const username = await getUsername();
        const postId = getPostId();

        const result = await guessTransferClub(
          postId,
          username,
          input.clubName
        );

        let earnings = null;
        let profile = await getOrCreatePlayerProfile(username);

        if (result.state.solved) {
          const rewards = await processSolveRewards(username, result.state);
          earnings = rewards.earnings;
          profile = rewards.profile;
        }

        return {
          correct: result.correct,
          matchedIndices: result.matchedIndices,
          state: result.state,
          clues: getVisibleTransferRoute(result.state),
          hintCost: getHintCost(result.state),
          penalty: 'penalty' in result ? result.penalty : undefined,
          earnings,
          profile,
        };
      }),

    revealTransferHint: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      const result = await revealTransferHint(postId, username);
      let earnings = null;
      let profile = await getOrCreatePlayerProfile(username);

      if (result.state.solved) {
        const rewards = await processSolveRewards(username, result.state);
        earnings = rewards.earnings;
        profile = rewards.profile;
      }

      return {
        revealedIndex: result.revealedIndex,
        club: result.club,
        cost: result.cost,
        state: result.state,
        clues: getVisibleTransferRoute(result.state),
        hintCost: getHintCost(result.state),
        earnings,
        profile,
      };
    }),

    giveUp: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      const state = await getOrCreateGameState(postId, username);
      state.solved = true;
      state.score = 0;
      state.wagerLocked = true;

      await redis.set(`game:${postId}:${username}`, JSON.stringify(state));
      await ensureDailyAllowance(username);
      const profile = await getOrCreatePlayerProfile(username);

      return { state, profile };
    }),

    reset: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      await redis.del(`game:${postId}:${username}`);
      await redis.del(`game:${postId}:mode`);
      await redis.del(`game:${postId}:player`);

      return { success: true };
    }),
  }),

  search: t.router({
    clubs: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => {
        return searchClubs(input.query);
      }),

    players: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(({ input }) => {
        return searchPlayers(input.query);
      }),
  }),

  leaderboard: t.router({
    global: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        return getGlobalLeaderboard(input?.limit ?? 10);
      }),

    daily: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        return getDailyLeaderboard(input?.limit ?? 10);
      }),

    me: publicProcedure.query(async () => {
      const username = await getUsername();
      const [globalEntry, dailyEntry, profile] = await Promise.all([
        getUserGlobalEntry(username),
        getUserDailyEntry(username),
        getOrCreatePlayerProfile(username),
      ]);
      return { globalEntry, dailyEntry, profile };
    }),
  }),
});

export type AppRouter = typeof appRouter;
