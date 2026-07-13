# FootBets

A football transfer trivia game for Reddit. Players wager points, use club/manager/jersey clues, and compete on daily and global leaderboards.

## For Reddit reviewers

### What this app does

FootBets posts an interactive game in a subreddit. The feed shows a splash screen; tapping **Play Now** opens the full game.

Each post is locked to **one game mode** and **one football player** (chosen randomly when the post is first created):

1. **Mystery Player** (`guess-player`) — clubs are revealed over time; guess the player's name.
2. **Transfer Route** (`predict-transfers`) — the player is named; fill in the missing clubs in their transfer history.

There is **no real-money gambling**. Points, wagers, and leaderboards are in-app only.

### How to install and open a post

1. Install **foot-bets** on a test subreddit.
2. As a **moderator**, open the subreddit menu and choose **Create a new post** (label: `foot-bets`).
3. Open the created post in the feed.
4. On the inline splash, tap **Play Now** to enter expanded mode.

A post is also created automatically on first install (`onAppInstall` trigger).

### Suggested review path

1. **Splash** — Confirm branding, username greeting, and **Play Now**.
2. **Load game** — Confirm the loading screen resolves into either Mystery Player or Transfer Route.
3. **Wager** — Before your first action, try the wager chips (`1×`–`2×`). Wager locks after the first guess or hint.
4. **Play a round**
   - **Mystery Player**: guess names; use Club / Jersey / Manager hints; optionally Give Up.
   - **Transfer Route**: guess missing club names; use Club hints; optionally Give Up.
5. **Wrong guesses** — Confirm score decreases and feedback shows.
6. **Solve or Give Up** — Confirm the results screen with earnings, streak/daily allowance if applicable, and leaderboards.
7. **Play Again** — Starts a new round for that user on the same post (same mode/player for the post; personal progress resets).
8. **Create another post** — Make a second post if you need to see the other mode (mode is random per post).

### Scoring (quick reference)

| Rule | Value |
| --- | --- |
| Starting round score | 100 |
| Wager multipliers | 1, 1.25, 1.5, 1.75, 2 |
| Wrong guess (Mystery Player) | −5 × wager |
| Wrong guess (Transfer Route) | −10 × wager |
| Jersey / Manager hints | −15 × wager each |
| Club hints | shared budget scaled by remaining clubs |
| Daily allowance | +100 (once per UTC day, on earn) |
| Streak bonus | +5 per streak day, capped at 7 days |

Earnings for a round ≈ `roundScore × wager`, plus streak bonus and daily allowance when claimed.

### Permissions

Configured in `devvit.json`:

- Reddit API as user: `SUBMIT_POST`, `SUBMIT_COMMENT`, `SUBSCRIBE_TO_SUBREDDIT`
- Moderator menu action to create posts
- Redis used for per-post game state, profiles, and leaderboards

### Notes for review

- Content is football transfer trivia (club logos, managers, jersey numbers). No NSFW content.
- Game state is per user per post; leaderboards are shared (global + daily).
- Inline view stays light (`splash.html`); gameplay runs in expanded view (`game.html`).

---

## Local development

Requires **Node.js 22+**.

```bash
npm install
npm run login
npm run dev
```

Useful commands:

| Command | Description |
| --- | --- |
| `npm run dev` | Playtest on your Devvit subreddit |
| `npm run build` | Build client and server |
| `npm run test` | Run Vitest |
| `npm run type-check` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run deploy` | Upload a new version |
| `npm run launch` | Deploy and publish for review |

### Project layout

- `src/client` — React UI (splash + game)
- `src/server` — Hono + tRPC, Redis game logic
- `src/shared` — Shared types and scoring constants

Docs: [developers.reddit.com](https://developers.reddit.com/)
