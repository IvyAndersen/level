// The level curve: reaching level L takes 500·(L-1) + 125·(L-1)·(L-2) XP in total, so each level
// asks 250 XP more than the one before (500, 750, 1000…). Someone training 3 to 4 times a week
// levels up about weekly at first, and every few weeks after a few months.

/** Total XP needed to reach `level` (level 1 is 0). */
export function xpToReach(level) {
  const n = Math.max(1, Math.floor(level)) - 1;
  return 500 * n + 125 * n * (n - 1);
}

/** Where `xp` stands: { level, xp, into, need, pct }. `into` is XP above the level's floor, `need` the span to the next. */
export function levelOf(xp) {
  const total = Number.isFinite(xp) && xp > 0 ? xp : 0;
  let level = 1;
  while (xpToReach(level + 1) <= total) level++;
  const floor = xpToReach(level);
  const need = xpToReach(level + 1) - floor;
  const into = total - floor;
  return { level, xp: total, into, need, pct: into / need };
}
