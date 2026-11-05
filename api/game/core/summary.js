// The one entry point the app and the leaderboard both read: everything the game knows about a
// profile, worked out from its workouts.
import { LAUNCH, MONDAY, SUNDAY } from './rules.js';
import { weekKeyOf } from './week.js';
import { levelOf } from './levels.js';
import { streakWalk } from './streak.js';
import { scoreWorkouts } from './xp.js';
import { unlockedAchievements } from './achievements.js';

/**
 * { xp, level, weekXp, streak, achievements, workouts }.
 *   weekXp   XP per Monday week ({ 'YYYY-MM-DD': n }), the shared leaderboard's weeks
 *   streak   the 3-a-week streak in the profile's own weeks, from `launch`
 * `seenDayOf(w)`: the day a workout was first seen (backdating), null when unknown.
 */
export function gameSummary(S, { today, seenDayOf = () => null, launch = LAUNCH } = {}) {
  const P = S && typeof S === 'object' ? S : {};
  const workouts = scoreWorkouts(P, { seenDayOf, launch });
  const xp = workouts.reduce((n, w) => n + w.xp, 0);
  const weekXp = {};
  for (const w of workouts) {
    const k = weekKeyOf(w.d, MONDAY);
    weekXp[k] = (weekXp[k] || 0) + w.xp;
  }
  const days = (Array.isArray(P.workouts) ? P.workouts : []).map(w => w?.d);
  const streak = streakWalk(days, { today, ws: P.weekStart === SUNDAY ? SUNDAY : MONDAY, since: launch });
  return {
    xp,
    level: levelOf(xp),
    weekXp,
    streak,
    achievements: unlockedAchievements(P, { launch, streakBest: streak.best }),
    workouts,
  };
}
