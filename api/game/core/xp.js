// XP from a profile's workouts. Nothing is stored: the same workouts always give the same XP, so an
// edit or a delete simply changes the answer, and two devices and the server agree.
//
// THE RULES (docs/superpowers/specs/2026-11-05-game-layer-design.md):
//   - a workout counts from the launch day, with at least one done work set (warm-ups don't count);
//   - it earns WORKOUT_XP, SET_XP per done work set (up to MAX_SETS_XP sets) and PR_XP per PR
//     (up to MAX_PRS_XP);
//   - `w.gplan` says what it was against the plan, stamped at finish (frontend lib/game.js):
//     'planned' earns PLANNED_BONUS, 'extra' earns EXTRA_BONUS for the first extra one of a day.
//     'free' (no plan) or no stamp: the first FREE_PLANNED_PER_WEEK of the profile's week count
//     as planned, the rest as extra;
//   - first seen more than BACKDATE_DAYS after its day: no XP at all;
//   - a day earns DAY_CAP at most: the workout that crosses it gets the remainder, later ones 0.
import {
  LAUNCH, WORKOUT_XP, SET_XP, MAX_SETS_XP, PR_XP, MAX_PRS_XP, PLANNED_BONUS, EXTRA_BONUS,
  DAY_CAP, BACKDATE_DAYS, FREE_PLANNED_PER_WEEK, SUNDAY, MONDAY,
} from './rules.js';
import { weekKeyOf, dayDiff, isISO } from './week.js';
import { doneWorkSets } from './sets.js';

const startOf = w => (Number.isFinite(Number(w.start)) ? Number(w.start) : 0);

/** The workouts that count for the game, oldest first: from `launch`, with done work. */
export function countedWorkouts(S, launch = LAUNCH) {
  return (Array.isArray(S?.workouts) ? S.workouts : [])
    .filter(w => w && typeof w === 'object' && isISO(w.d) && w.d >= launch && doneWorkSets(w).length > 0)
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : startOf(a) - startOf(b)));
}

/**
 * Per-workout XP, oldest first: [{ id, d, xp, parts: { workout, sets, prs, bonus }, kind, capped, reason? }].
 * `seenDayOf(w)` is the ISO day the workout was first seen, or null for "not backdated".
 */
export function scoreWorkouts(S, { seenDayOf = () => null, launch = LAUNCH } = {}) {
  const ws = S?.weekStart === SUNDAY ? SUNDAY : MONDAY;
  const freeInWeek = new Map();
  const extraOnDay = new Set();
  const dayTotal = new Map();
  const out = [];
  for (const w of countedWorkouts(S, launch)) {
    let kind = w.gplan === 'planned' ? 'planned' : w.gplan === 'extra' ? 'extra' : null;
    if (!kind) {
      const k = weekKeyOf(w.d, ws);
      const n = (freeInWeek.get(k) || 0) + 1;
      freeInWeek.set(k, n);
      kind = n <= FREE_PLANNED_PER_WEEK ? 'planned' : 'extra';
    }
    const seen = seenDayOf(w);
    if (isISO(seen) && dayDiff(w.d, seen) > BACKDATE_DAYS) {
      out.push({ id: w.id, d: w.d, xp: 0, parts: { workout: 0, sets: 0, prs: 0, bonus: 0 }, kind, capped: false, reason: 'backdated' });
      continue;
    }
    let bonus = 0;
    if (kind === 'planned') bonus = PLANNED_BONUS;
    else if (!extraOnDay.has(w.d)) { bonus = EXTRA_BONUS; extraOnDay.add(w.d); }
    const prs = Array.isArray(w.prs) ? w.prs.length : 0;
    const parts = {
      workout: WORKOUT_XP,
      sets: SET_XP * Math.min(doneWorkSets(w).length, MAX_SETS_XP),
      prs: PR_XP * Math.min(prs, MAX_PRS_XP),
      bonus,
    };
    const raw = parts.workout + parts.sets + parts.prs + parts.bonus;
    const so = dayTotal.get(w.d) || 0;
    const xp = Math.max(0, Math.min(raw, DAY_CAP - so));
    dayTotal.set(w.d, so + xp);
    out.push({ id: w.id, d: w.d, xp, parts, kind, capped: xp < raw });
  }
  return out;
}
