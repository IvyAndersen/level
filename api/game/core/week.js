// Calendar helpers for the game layer, on local-noon dates like frontend/src/lib/format.js, so a
// date string means the same day in every time zone and across daylight-saving changes.

const pad = n => String(n).padStart(2, '0');
const noon = iso => new Date(iso + 'T12:00:00');
export const isoOfDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const isISO = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/** The first day of the week `iso` is in, as 'YYYY-MM-DD'. `ws` is 1 (Monday) or 0 (Sunday). */
export function weekKeyOf(iso, ws = 1) {
  const d = noon(iso);
  const back = (d.getDay() - (ws === 0 ? 0 : 1) + 7) % 7;
  d.setDate(d.getDate() - back);
  return isoOfDate(d);
}

/** The week key `n` weeks after `key` (before, for a negative n). */
export function plusWeeks(key, n = 1) {
  const d = noon(key);
  d.setDate(d.getDate() + 7 * n);
  return isoOfDate(d);
}

/** Whole days from `a` to `b` (negative when b is earlier). */
export function dayDiff(a, b) {
  return Math.round((noon(b) - noon(a)) / 86400000);
}
