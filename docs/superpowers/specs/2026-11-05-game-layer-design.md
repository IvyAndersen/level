# Game layer: levels, achievements, 3-a-week streak, leaderboard

Status: draft, 2026-11-05. A fork of openGym (github.com/DuarteSantos8/openGym, AGPL-3.0) hosted
for one person and a small group of friends.

## Intent

Make openGym feel a bit like a game so a group of friends trains more consistently and has
something light to compete over, without turning a serious training app into a toy. Ranking is
about **effort and consistency, not raw strength**: a beginner who shows up should be able to
beat a strong friend who doesn't.

## Who and where

- One self-hosted instance on **Railway** (api + web as two services, `api` with a persistent
  volume for `DATA_DIR`), used by the owner and a handful of friends, each with their own account
  (openGym already supports this: passkey/password sign-in, one `state-<uid>.json` per user).
- Friends use the **web app / PWA** ("Add to Home Screen") at the Railway URL. The official App
  Store / Play / watch apps will not carry these changes and are out of scope.
- AGPL: the fork's source must be offered to the people using the hosted instance (a public fork
  link in the app/README is enough). Exercise media stay unmodified at 180 px, non-commercial,
  NOTICE.md kept. **No achievement art or other generated imagery may be derived from the
  exercise media** (NOTICE.md forbids it).

## Goals

1. **XP and levels.** Every user earns XP for effort; XP fills a level bar; levels get gradually
   harder to reach.
2. **Achievements** (badges), mostly about weights, unlocked once and kept.
3. **3-a-week streak**: a week counts when it has at least 3 workouts; the streak is consecutive
   counting weeks.
4. **Leaderboard** shared by everyone on the instance, ranked by XP.
5. **Privacy switch**: any user can hide their activity from others.
6. **Off switch**: any user can turn the whole game layer off and get plain openGym.

## Non-goals

- Native mobile / watch apps, App Store builds.
- Friend requests, groups, feeds, comments, likes, chat. There is one leaderboard per instance.
- Strength-based rankings (heaviest lift, Wilks/DOTS boards).
- Retroactive scoring of history (see "Start from zero").
- Anti-cheat beyond the light caps below. These are friends.

## Anti-goals (would be a failure even if it works)

- **Too flashy**: confetti, sounds, full-screen pop-ups, bright game chrome that clashes with
  openGym's dark minimal look.
- **Takes too long**: anything that adds steps or waiting to logging a workout or finishing one.
  Nothing new appears *during* a workout. Any animation is under ~1 second and skippable.
- Breaking or slowing existing openGym behaviour, sync, or its test suite.

## Rules

### Start from zero
The game layer has a **launch date** (per instance). Only workouts whose day is on or after the
launch date earn XP, count for achievements, or count for the 3-a-week streak. Everyone starts at
level 1 with 0 XP on the same day. The launch date is set once by the instance owner (an env var
or admin setting is the builder's call).

### XP sources
- **Completed workout**: base XP. A workout is the dominant source; individual sets add a small
  amount so a session can't be gamed by splitting it into many tiny sets.
- **Completed sets**: small XP per completed working set (warm-ups excluded), capped per workout.
- **PR**: bonus XP per PR detected (openGym already detects PRs at finish).
- **Planned-workout bonus**: extra XP when the finished session was the one planned for that day
  (weekday plan or rotation, including a session the user moved to that day).
- **Extra-workout bonus**: extra XP for a session beyond the plan, smaller than the planned bonus,
  at most one per day.
- **Streak boost** (*builder may drop if it complicates things*): a small multiplier once the
  3-a-week streak is long, e.g. +10% from 4 weeks.
- Exact numbers are the builder's call; they must be constants in one place, easy to retune.

### Light anti-abuse
- A per-day XP cap.
- Workouts **backdated more than 3 days** (day far older than when it was saved) earn no XP.
- Editing or deleting a workout recomputes XP from what's there; nothing is double-counted.

### Levels
A level curve where each level needs somewhat more XP than the last, tuned so a friend training
3–4 times a week levels up roughly every week or two early on, slowing over months. Builder picks
the formula.

### Achievements
- A fixed catalogue defined in code (id, name, description, condition), unlocked once, with the
  date unlocked. Mostly **weight-based**, with some within reach for beginners:
  - absolute lift milestones (e.g. bench / squat / deadlift at 60, 100, 140 kg… with lb shown for
    lb users),
  - relative milestones (e.g. bench your body weight, deadlift 2× body weight, when a weigh-in
    exists),
  - volume milestones (e.g. 1,000 kg in one session, 10,000 kg in a week),
  - PR counts (first PR, 10, 50),
  - streak and consistency (3-a-week streak of 4, 12, 26 weeks; first planned week completed).
- Starter catalogue of ~20–30 is enough. Badge visuals are simple, in-house (icon + label in the
  app's existing style).
- Only counts activity on/after the launch date.

### 3-a-week streak
- A week (the user's own Monday/Sunday week start) counts if it has ≥3 workouts on/after launch.
- Streak = consecutive counting weeks; the current week is "open" until it ends.
- **It replaces openGym's existing week streak** (owner's decision). `lib/streak.js` changes its
  rule from ≥1 to ≥3 workouts per week, and every place that shows the streak (Home card, Stats,
  milestone badges, recap, watch) shows this one. There is one streak number in the app, never two.
- **Freezes are kept** as they work today: every 4th counting week earns a freeze, at most 2
  banked, and a missed week spends one instead of breaking the streak.
- *My call:* when the game layer is on, the streak counts from the launch date, like XP. With
  the game layer off, it still uses the 3-a-week rule (it's this fork's only streak) over the
  whole history.
- The existing streak milestone badges (4, 12, 26, 52, 104 weeks) become the streak achievements.

### Leaderboard
- One per instance, all users who haven't hidden themselves.
- **Weekly** (XP earned this week) and **all-time** (total XP since launch) views.
- Each row: display name, level, XP for the period, current 3-a-week streak.
- Tapping a row may show that user's level and unlocked achievements (builder's call).

### Privacy
- "Hide my activity" setting, default **off** (visible). When on: not on the leaderboard, level
  and achievements not visible to anyone else. The user still earns everything and sees it
  themselves.
- Only game-layer numbers are ever shared: name, level, XP, streak, achievements. Never workouts,
  weights, body weight or any other part of a user's state.

### Off switch
A Settings toggle (fits openGym's existing Modules system, docs/MODULES.md) that removes the game
layer from every screen. A user who turns it off is also hidden from the leaderboard.

## Where it shows up

- **During a workout**: nothing new.
- **Finish screen**: one compact block: XP earned with a short breakdown, level bar, any new
  achievement or streak change. Readable in a couple of seconds, one tap to dismiss.
- **Home**: one compact card: level, XP bar, 3-a-week streak.
- **A game page** (its own tab or a section under Stats, builder's call): leaderboard, own
  achievements, level details.
- **Settings**: the off switch and the hide switch.
- Look: openGym's existing dark minimal style and accent colour; no new visual language.

## Constraints from the codebase

- Frontend: React 19 + Vite, Zustand store (`store/useStore.js`), pure helpers in `lib/` each with
  a `*.test.js` (vitest). Backend: plain `node:http` in `api/server.js` with small modules, `node
  --test`. No TypeScript, no linter; match the existing style. All UI strings go through the
  locale files (CI runs `check-locales.mjs` / `check-source-strings.mjs --strict`); English is
  required, other locales may fall back.
- openGym's existing motivation features (week streak, monthly challenges, trophy shelf, recap)
  are **derived from the workouts, not stored**, so devices, backups and imports always agree.
  The game layer should follow the same principle: XP, level, streak and achievements are
  computed from the workouts; store only what must be remembered (e.g. which unlocks were already
  celebrated, unlock dates if needed).
- The leaderboard needs cross-user data, which openGym never exposes today. The **server** must
  compute each user's game summary from their own state file (as `api/wrapped.js` does for the
  December push) and serve only those numbers, respecting hide/off. The server's computation is
  the source of truth for the leaderboard, so a user can't just edit their local XP.
- New API routes go into `api/openapi.yaml` (CI checks docs are in sync).
- New features belong behind openGym's module system so they can be turned off cleanly.

## Left to the builder

- XP values, level curve, caps, the streak boost (or dropping it).
- The exact achievement list within the categories above.
- Code layout, whether the XP engine is one shared module used by both frontend and api (like
  `coach/core/`), caching, route names.
- Game page placement (tab vs Stats section) and leaderboard row tap behaviour.
- How the launch date is configured.
- Railway deployment details and a backup job for the data volume (a later, separate task).

## Calls made in writing this (owner may override)

- **Achievements are derived, not stored.** Unlocks are read back from the workouts like
  everything else; deleting the workout that earned a badge removes it. Only "already
  celebrated" and the unlock date may be stored, as `S.streakSeen` does today. Keeps sync,
  imports and the server's leaderboard simple.
- **Weekly leaderboard window**: one shared week for everyone, Monday to Sunday on the server's
  clock (set `TZ` on Railway to the group's timezone). Each user's own 3-a-week streak keeps
  following their own week-start setting.
- **Planned vs extra**: a session counts as *planned* when it is the day's scheduled routine
  (weekday plan, or a session moved to that day) or, on a rotation, the next session in line on
  any day. **A user with no plan** has their first 3 workouts of each week counted as planned
  (matching the streak target) and the rest as extra, so planless friends aren't disadvantaged.
- **Leaderboard name**: the account's existing name (`user.name` in `db.json`). No separate
  nickname. Guest profiles and disabled accounts are never listed.
- **Backdating**: the server records the date it first sees each workout id (a small per-user
  map it keeps, next to the state file or in `db.json`). A workout whose day is more than 3 days
  before that first-seen date earns no XP. This is the one piece of server-side bookkeeping the
  rule needs.
- **Units**: one achievement catalogue defined in kg; lb users see the thresholds converted and
  rounded for display. Switching units never changes what is unlocked.

