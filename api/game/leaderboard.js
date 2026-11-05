// The instance leaderboard: one per server, everyone on it who has not hidden themselves. The
// server is its source of truth: it scores each profile's own state file with the same core the
// app uses (game/core/summary.js), so editing your XP on a device changes nothing here.
//
// THE LEDGER (DATA_DIR/game-seen-<uid>.json, { v: 1, seen: { workoutId: 'YYYY-MM-DD' } }): the
// day the server first saw each workout, for the backdating rule (a workout first seen more than
// BACKDATE_DAYS after its day earns no XP). A new ledger trusts what is already there, so going
// live never marks anyone's history as backdated.
//
// WHAT A ROW SAYS: name, level, XP, streak, achievement ids, and whether it is you. Nothing else of
// anyone's state ever leaves through here.
import { gameSummary } from './core/summary.js';
import { weekKeyOf } from './core/week.js';
import { MONDAY } from './core/rules.js';

const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);

/** The ledger after a write of `workouts`: { ledger, changed }. */
export function updateSeen(ledger, workouts, todayISO) {
  const fresh = !isMap(ledger) || !isMap(ledger.seen);
  const was = fresh ? {} : ledger.seen;
  const seen = {};
  let changed = fresh;
  for (const w of Array.isArray(workouts) ? workouts : []) {
    if (!isMap(w) || w.id == null) continue;
    const id = String(w.id);
    if (typeof was[id] === 'string') seen[id] = was[id];
    else { seen[id] = fresh && typeof w.d === 'string' ? w.d : todayISO; changed = true; }
  }
  if (!fresh && Object.keys(was).some(id => !(id in seen))) changed = true;
  return { ledger: { v: 1, seen }, changed };
}

/** Whether a profile shows on the board: not hidden, game module not off. */
export const isListed = S => !(S?.gameHidden === true || S?.modules?.game === false);

/**
 * Rows for `users` ([{ id, name, S, ledger }]), best first: [{ name, level, xp, streak, achievements, me }].
 * `period` 'week' is this Monday week on the server's clock, 'all' everything since launch.
 */
export function leaderboardRows(users, { period, today, meId }) {
  const week = weekKeyOf(today, MONDAY);
  const rows = [];
  for (const u of Array.isArray(users) ? users : []) {
    if (!u || !isListed(u.S)) continue;
    const seen = isMap(u.ledger?.seen) ? u.ledger.seen : {};
    const sum = gameSummary(u.S || {}, { today, seenDayOf: w => (typeof seen[String(w.id)] === 'string' ? seen[String(w.id)] : null) });
    rows.push({
      name: String(u.name || '').slice(0, 40),
      level: sum.level.level,
      xp: period === 'week' ? sum.weekXp[week] || 0 : sum.xp,
      streak: sum.streak.current,
      achievements: sum.achievements.map(a => a.id),
      me: u.id === meId,
    });
  }
  return rows.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
}
