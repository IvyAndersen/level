// Reading logged sets the way frontend/src/lib/workout-model.js does, cut down to what the game
// needs. Kept here because the core may import nothing from the frontend.

const obj = v => (v && typeof v === 'object' ? v : {});

/** A per-side row (lunges, single-arm work): both sides logged on one row. */
export const isSideSet = s => !!(obj(s).sides && typeof s.sides === 'object' && s.sides.L && s.sides.R);

/** A warm-up row: phase 'warmup', or the older `warmup: true`. */
export const isWarmup = s => obj(s).phase === 'warmup' || obj(s).warmup === true;

/** Ticked: the row, or for a per-side row either side. */
export const isDone = s => (isSideSet(s) ? s.sides.L.done === true || s.sides.R.done === true : obj(s).done === true);

/** Done work rows of a workout (warm-ups left out). */
export function doneWorkSets(w) {
  const out = [];
  for (const e of Array.isArray(obj(w).entries) ? w.entries : []) {
    for (const s of Array.isArray(obj(e).sets) ? e.sets : []) if (s && isDone(s) && !isWarmup(s)) out.push({ exId: e.id, set: s });
  }
  return out;
}

/** The loads × reps a done row actually moved, in the profile's unit, drops included. */
export function setVolume(s) {
  const one = x => {
    if (!x || x.done !== true) return 0;
    const drops = Array.isArray(x.drops) ? x.drops : [];
    return (Number(x.w) || 0) * (Number(x.r) || 0) + drops.reduce((n, d) => n + (Number(d?.w) || 0) * (Number(d?.r) || 0), 0);
  };
  return isSideSet(s) ? one(s.sides.L) + one(s.sides.R) : one(s);
}

/** The heaviest load of a done row with at least one rep, in the profile's unit. */
export function setTopLoad(s) {
  const one = x => (x && x.done === true && (Number(x.r) || 0) >= 1 ? Number(x.w) || 0 : 0);
  return isSideSet(s) ? Math.max(one(s.sides.L), one(s.sides.R)) : one(s);
}
