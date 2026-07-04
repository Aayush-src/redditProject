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
  searchClubs,
  searchPlayers,
} from './core/game';
import { submitScore, getLeaderboard, getUserScore } from './core/leaderboard';

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

      const state = await getOrCreateGameState(postId, username);

      let clues;
      if (state.mode === 'guess-player') {
        clues = getRevealedClubs(state);
      } else {
        clues = getVisibleTransferRoute(state);
      }

      const fullClubs = state.solved ? getFullPlayerClubs(state.playerId) : null;
      const playerName = getPlayerName(state.playerId);
      const currentHintCost = getHintCost(state);
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
        revealedJerseys,
        revealedManagers,
      };
    }),
  }),

  game: t.router({
    guessPlayer: publicProcedure
      .input(z.object({ guess: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const username = await getUsername();
        const postId = getPostId();

        const result = await guessPlayer(postId, username, input.guess);

        if (result.correct && result.state.score > 0) {
          await submitScore(postId, username, result.state.score, 'guess-player');
        }

        return {
          correct: result.correct,
          state: result.state,
          playerName: result.playerName,
          clues: getRevealedClubs(result.state),
          fullClubs: result.state.solved ? getFullPlayerClubs(result.state.playerId) : null,
          hintCost: getHintCost(result.state),
        };
      }),

    revealClub: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      const result = await revealClub(postId, username);
      return {
        club: result.club,
        cost: result.cost,
        state: result.state,
        clues: getRevealedClubs(result.state),
        hintCost: getHintCost(result.state),
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

        if (result.state.solved && result.state.score > 0) {
          await submitScore(postId, username, result.state.score, 'predict-transfers');
        }

        return {
          correct: result.correct,
          matchedIndices: result.matchedIndices,
          state: result.state,
          clues: getVisibleTransferRoute(result.state),
          hintCost: getHintCost(result.state),
        };
      }),

    revealTransferHint: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      const result = await revealTransferHint(postId, username);
      return {
        revealedIndex: result.revealedIndex,
        club: result.club,
        cost: result.cost,
        state: result.state,
        clues: getVisibleTransferRoute(result.state),
        hintCost: getHintCost(result.state),
      };
    }),

    giveUp: publicProcedure.mutation(async () => {
      const username = await getUsername();
      const postId = getPostId();

      const state = await getOrCreateGameState(postId, username);
      state.solved = true;
      state.score = 0;

      await redis.set(`game:${postId}:${username}`, JSON.stringify(state));
      await submitScore(postId, username, 0, state.mode);

      return { state };
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
    get: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ input }) => {
        const postId = getPostId();
        return getLeaderboard(postId, input?.limit ?? 10);
      }),

    myScore: publicProcedure.query(async () => {
      const username = await getUsername();
      const postId = getPostId();
      return getUserScore(postId, username);
    }),
  }),
});

export type AppRouter = typeof appRouter;
