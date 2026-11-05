// Achievements: a fixed catalogue, read back from the workouts like everything in the game. An
// achievement is unlocked while a counted workout (from the launch day, with done work) meets it,
// so deleting that workout takes it back. Weights are compared in kg, whatever the profile's unit.
//
// `title` and `desc` are English keys, translated where they are shown (frontend t()).
import { LAUNCH, LIFTS, LB_KG, STREAK_BADGES, MONDAY } from './rules.js';
import { weekKeyOf } from './week.js';
import { countedWorkouts } from './xp.js';
import { doneWorkSets, setTopLoad, setVolume } from './sets.js';

const LIFT_NAME = { bench: 'Bench press', squat: 'Squat', deadlift: 'Deadlift' };
const LIFT_STEPS = { bench: [40, 60, 80, 100, 120, 140], squat: [60, 100, 140, 180], deadlift: [60, 100, 140, 180, 220] };
const RELATIVE = [
  { id: 'rel-bench-1x', lift: 'bench', x: 1, title: 'Body weight bench', desc: 'Bench press your own body weight.' },
  { id: 'rel-squat-1.5x', lift: 'squat', x: 1.5, title: 'One and a half', desc: 'Squat one and a half times your body weight.' },
  { id: 'rel-deadlift-2x', lift: 'deadlift', x: 2, title: 'Double up', desc: 'Deadlift twice your body weight.' },
];

export const ACHIEVEMENTS = [
  ...Object.entries(LIFT_STEPS).flatMap(([lift, steps]) => steps.map(kg => ({
    id: `${lift}-${kg}`, group: 'lift', lift, kg,
    title: `${LIFT_NAME[lift]} ${kg} kg`, desc: `Lift ${kg} kg for at least one rep.`,
  }))),
  ...RELATIVE.map(r => ({ ...r, group: 'relative' })),
  { id: 'vol-session-1000', group: 'volume', kg: 1000, title: 'A tonne', desc: 'Move 1,000 kg in one workout.' },
  { id: 'vol-session-5000', group: 'volume', kg: 5000, title: 'Five tonnes', desc: 'Move 5,000 kg in one workout.' },
  { id: 'vol-week-10000', group: 'volume', kg: 10000, week: true, title: 'Ten tonne week', desc: 'Move 10,000 kg in one week.' },
  ...[[1, 'First PR', 'Set your first personal record.'], [10, '10 PRs', 'Set 10 personal records.'], [50, '50 PRs', 'Set 50 personal records.']]
    .map(([n, title, desc]) => ({ id: `pr-${n}`, group: 'prs', n, title, desc })),
  ...STREAK_BADGES.map(n => ({ id: `streak-${n}`, group: 'streak', n, title: `${n} week streak`, desc: `Train 3 times a week, ${n} weeks in a row.` })),
  ...[[1, 'First workout', 'Finish your first workout.'], [10, '10 workouts', 'Finish 10 workouts.'], [50, '50 workouts', 'Finish 50 workouts.'], [100, '100 workouts', 'Finish 100 workouts.']]
    .map(([n, title, desc]) => ({ id: `workouts-${n}`, group: 'workouts', n, title, desc })),
];
export const ACHIEVEMENT = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));

const LIFT_OF = Object.fromEntries(Object.entries(LIFTS).flatMap(([lift, ids]) => ids.map(id => [String(id), lift])));

/** The latest weigh-in on or before `d`, in kg, or null. */
function bodyweightOn(S, d, toKg) {
  let best = null;
  for (const b of Array.isArray(S?.bodyweight) ? S.bodyweight : []) {
    if (!b || typeof b.d !== 'string' || b.d > d || !(Number(b.w) > 0)) continue;
    if (!best || b.d >= best.d) best = b;
  }
  return best ? toKg(Number(best.w)) : null;
}

/** [{ id, d }] in catalogue order; `d` is the day it was first met (null for streak badges). */
export function unlockedAchievements(S, { launch = LAUNCH, streakBest = 0 } = {}) {
  const toKg = S?.unit === 'lb' ? v => v * LB_KG : v => v;
  const first = new Map();
  const hit = (id, d) => { if (!first.has(id)) first.set(id, d); };
  const weekVol = new Map();
  let prs = 0, count = 0;
  for (const w of countedWorkouts(S, launch)) {
    count++;
    for (const a of ACHIEVEMENTS) if (a.group === 'workouts' && count >= a.n) hit(a.id, w.d);
    prs += Array.isArray(w.prs) ? w.prs.length : 0;
    for (const a of ACHIEVEMENTS) if (a.group === 'prs' && prs >= a.n) hit(a.id, w.d);

    const top = {};
    let vol = 0;
    for (const { exId, set } of doneWorkSets(w)) {
      vol += toKg(setVolume(set));
      const lift = LIFT_OF[String(exId)];
      if (lift) top[lift] = Math.max(top[lift] || 0, toKg(setTopLoad(set)));
    }
    // A hair under the threshold still counts: a 225 lb bar is 102.06 kg, 100 kg typed in lb is 99.99.
    const meets = (kg, need) => kg + 0.05 >= need;
    for (const a of ACHIEVEMENTS) if (a.group === 'lift' && meets(top[a.lift] || 0, a.kg)) hit(a.id, w.d);
    const bw = RELATIVE.some(r => top[r.lift]) ? bodyweightOn(S, w.d, toKg) : null;
    if (bw) for (const r of RELATIVE) if (top[r.lift] && meets(top[r.lift], bw * r.x)) hit(r.id, w.d);

    const wk = weekKeyOf(w.d, MONDAY);
    weekVol.set(wk, (weekVol.get(wk) || 0) + vol);
    for (const a of ACHIEVEMENTS) {
      if (a.group !== 'volume') continue;
      if (a.week ? weekVol.get(wk) >= a.kg : vol >= a.kg) hit(a.id, w.d);
    }
  }
  for (const n of STREAK_BADGES) if (streakBest >= n) hit(`streak-${n}`, null);
  return ACHIEVEMENTS.filter(a => first.has(a.id)).map(a => ({ id: a.id, d: first.get(a.id) }));
}
