// The week streak: weeks in a row with at least three workouts (STREAK_MIN), in the profile's own
// weeks (Monday or Sunday first), with the best run ever, freezes and milestone badges. The walk
// itself lives in api/game/core/streak.js, shared with the leaderboard so both show one number.
//
// Everything here is read back from the workouts, nothing of it is stored: two devices, a restored
// backup or an import of old sessions all arrive at the same streak, and there is nothing for a sync
// to merge. The one stored thing is which celebration was already shown (S.streakSeen, below).
//
// THE FREEZE RULE. Walk the weeks from the first counting one up to this one:
//   - a week with 3 workouts adds one to the streak; every 4th of them in the run earns a freeze,
//     and at most 2 are kept (an earned one past that is simply not added);
//   - a week gone by with fewer uses a freeze when there is one: the streak carries on (the week
//     itself adds nothing) and the week is shown with a snowflake. Without a freeze the streak and
//     the freezes start over at 0;
//   - this week, not at 3 yet, is open: it neither counts nor breaks anything yet.
// So a holiday or a cold is covered without anyone having to remember a switch first: train 4
// weeks, and the next missed one is forgiven. Two missed weeks need two freezes, i.e. 8 weeks.
//
// With the game module on (Levels and leaderboard), only workouts from the game's launch day count,
// like the XP. Off, the whole history does.
import { todayISO, weekStartOf } from './format.js'
import { isOn } from './modules.js'
import { streakWalk } from '../../../api/game/core/streak.js'
import { LAUNCH } from '../../../api/game/core/rules.js'
import { countedWorkouts } from '../../../api/game/core/xp.js'

export { FREEZE_EVERY, FREEZE_MAX, STREAK_BADGES, STREAK_MIN } from '../../../api/game/core/rules.js'

/**
 * The streak as of `today`:
 *   current       counting weeks in the running streak (this week counted once it has 3)
 *   best          the longest run ever (current included)
 *   freezes       freezes banked now, 0..FREEZE_MAX
 *   frozen        the week keys (first day of the week) a freeze covered in the running streak
 *   thisWeekDone  whether this week has its 3 workouts yet; thisWeekCount how many it has so far
 *   badges        the milestones the best run has reached; next: the next one, or null
 *   toNextFreeze  counting weeks still needed for the next freeze (0 when the bank is full)
 */
export function streakInfo (S, today = todayISO()) {
  // With the game on, the streak is the game's: from the launch day, sessions with done work only
  // (the same ones that earn XP). Off, every logged workout counts, as the streak always did.
  const game = isOn(S, 'game')
  const days = game ? countedWorkouts(S, LAUNCH).map(w => w.d) : (Array.isArray(S?.workouts) ? S.workouts : []).map(w => w?.d)
  return streakWalk(days, { today, ws: weekStartOf(S), since: game ? LAUNCH : null })
}

/** Just the number, as Home, Stats, the report and the widgets show it. */
export const streakWeeks = (S, today = todayISO()) => streakInfo(S, today).current

/**
 * What Home should celebrate now, once: a milestone the best run reached since the last one
 * shown, or this week done (its 3 workouts in). `tally` (lib/queue.js weekTally) is accepted
 * for the callers' sake and no longer decides anything: the week counts at 3. Returns null, or
 * { kind: 'badge', weeks } / { kind: 'week', weeks }, plus `seen`: what S.streakSeen becomes once
 * it was shown. A badge marks the week as seen too, so the two never come one after the other.
 *
 * A profile that never saw one (no S.streakSeen yet, e.g. right after the update) gets its top
 * badge so far once: a welcome for the run it already has, then the usual one at a time.
 */
export function streakCelebration (S, info, _tally = {}) {
  const seen = S?.streakSeen && typeof S.streakSeen === 'object' ? S.streakSeen : {}
  const top = info.badges.at(-1) || 0
  const weekDone = info.thisWeekDone
  const wk = weekDone ? info.weekKey : (seen.wk ?? null)
  if (top > (Number(seen.badge) || 0)) return { kind: 'badge', weeks: top, seen: { badge: top, wk } }
  if (weekDone && seen.wk !== info.weekKey) return { kind: 'week', weeks: info.current, seen: { badge: Number(seen.badge) || 0, wk } }
  return null
}
