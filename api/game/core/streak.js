// The week streak: weeks in a row with at least STREAK_MIN workouts, in the profile's own weeks,
// with the best run ever, freezes and milestone badges. Shared by the app (frontend lib/streak.js)
// and the leaderboard, so both always show the same number.
//
// THE FREEZE RULE (unchanged from openGym's one-a-week streak). Walk the weeks from the first
// counting one up to this one:
//   - a counting week adds one to the streak; every FREEZE_EVERY-th of them in the run earns a
//     freeze, and at most FREEZE_MAX are kept;
//   - a week gone by without enough workouts uses a freeze when there is one (the streak carries
//     on, the week adds nothing). Without a freeze the streak and the freezes start over at 0;
//   - this week, not counting yet, is open: it neither counts nor breaks anything.
import { STREAK_MIN, FREEZE_EVERY, FREEZE_MAX, STREAK_BADGES } from './rules.js';
import { weekKeyOf, plusWeeks, isISO } from './week.js';

// Far enough back for any real history, short enough that a typo'd year cannot spin the loop.
const MAX_WEEKS = 1500;

/**
 * `days`: one ISO day per workout. Options: `today` (ISO), `ws` (1 Monday, 0 Sunday), `since`
 * (ISO or null: days before it are ignored), `min` (workouts a week needs, STREAK_MIN by default).
 */
export function streakWalk(days, { today, ws = 1, since = null, min = STREAK_MIN } = {}) {
  const cur = weekKeyOf(today, ws);
  const count = new Map();
  for (const d of Array.isArray(days) ? days : []) {
    if (!isISO(d) || (since && d < since)) continue;
    const k = weekKeyOf(d, ws);
    if (k <= cur) count.set(k, (count.get(k) || 0) + 1);
  }
  const thisWeekCount = count.get(cur) || 0;
  const counts = k => (count.get(k) || 0) >= min;
  const empty = { current: 0, best: 0, freezes: 0, frozen: [], thisWeekDone: false, thisWeekCount, badges: [], next: STREAK_BADGES[0], toNextFreeze: FREEZE_EVERY, weekKey: cur };
  const counting = [...count.keys()].filter(counts).sort();
  if (!counting.length) return empty;
  let wk = counting[0];
  const floor = plusWeeks(cur, -MAX_WEEKS);
  if (wk < floor) wk = floor;
  let run = 0, best = 0, freezes = 0, earned = 0, frozen = [];
  for (let i = 0; i <= MAX_WEEKS && wk <= cur; i++, wk = plusWeeks(wk)) {
    if (counts(wk)) {
      run++;
      earned++;
      if (earned % FREEZE_EVERY === 0 && freezes < FREEZE_MAX) freezes++;
    } else if (wk !== cur) {
      if (freezes > 0) { freezes--; frozen.push(wk); } else { run = 0; earned = 0; freezes = 0; frozen = []; }
    }
    if (run > best) best = run;
  }
  return {
    current: run,
    best,
    freezes,
    frozen,
    thisWeekDone: counts(cur),
    thisWeekCount,
    badges: STREAK_BADGES.filter(b => best >= b),
    next: STREAK_BADGES.find(b => best < b) ?? null,
    toNextFreeze: freezes >= FREEZE_MAX ? 0 : FREEZE_EVERY - (earned % FREEZE_EVERY),
    weekKey: cur,
  };
}
