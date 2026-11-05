// The 3-a-week streak walk (api/game/core/streak.js): weeks in a row with at least three workouts,
// with the freezes openGym's week streak always had.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { streakWalk } from '../game/core/streak.js';

// Monday weeks: 2026-10-05, -12, -19, -26, 11-02 (today's week is 11-02, today Thursday 11-05).
const TODAY = '2026-11-05';
const three = monday => { const d = new Date(monday + 'T12:00:00'); return [0, 2, 4].map(i => { const x = new Date(d); x.setDate(d.getDate() + i); return x.toISOString().slice(0, 10); }); };

test('two full past weeks and nothing yet this week: 2, and this week still open', () => {
  const r = streakWalk([...three('2026-10-19'), ...three('2026-10-26')], { today: TODAY, ws: 1 });
  assert.equal(r.current, 2);
  assert.equal(r.thisWeekDone, false);
  assert.equal(r.thisWeekCount, 0);
  assert.equal(r.weekKey, '2026-11-02');
});

test('a week of 2 with no freeze banked breaks the streak; the next full week starts at 1', () => {
  const days = [...three('2026-10-12'), '2026-10-19', '2026-10-20', ...three('2026-10-26')];
  const r = streakWalk(days, { today: TODAY, ws: 1 });
  assert.equal(r.current, 1);
  assert.equal(r.best, 1);
});

test('four full weeks earn a freeze; a short week spends it and the run carries on', () => {
  const days = [...three('2026-09-21'), ...three('2026-09-28'), ...three('2026-10-05'), ...three('2026-10-12'), '2026-10-20', ...three('2026-10-26')];
  const r = streakWalk(days, { today: TODAY, ws: 1 });
  assert.equal(r.current, 5);
  assert.deepEqual(r.frozen, ['2026-10-19']);
  assert.equal(r.freezes, 0);
});

test('this week counts once it reaches 3', () => {
  const r = streakWalk([...three('2026-10-26'), '2026-11-02', '2026-11-03', '2026-11-04'], { today: TODAY, ws: 1 });
  assert.equal(r.current, 2);
  assert.equal(r.thisWeekDone, true);
  assert.equal(r.thisWeekCount, 3);
});

test('workouts before `since` are ignored', () => {
  const r = streakWalk(three('2026-10-26'), { today: TODAY, ws: 1, since: '2026-11-01' });
  assert.equal(r.current, 0);
  assert.equal(r.best, 0);
});

test('min: 1 is the old one-a-week rule', () => {
  const r = streakWalk(['2026-10-20', '2026-10-27'], { today: TODAY, ws: 1, min: 1 });
  assert.equal(r.current, 2);
});

test('Sunday weeks follow the profile', () => {
  // Sunday 11-01 opens the week of 11-05 when Sunday comes first.
  const r = streakWalk(['2026-11-01', '2026-11-02', '2026-11-03'], { today: TODAY, ws: 0 });
  assert.equal(r.weekKey, '2026-11-01');
  assert.equal(r.thisWeekDone, true);
});

test('nothing at all, or junk, is an empty streak', () => {
  for (const days of [[], null, ['nope', 42]]) {
    const r = streakWalk(days, { today: TODAY, ws: 1 });
    assert.equal(r.current, 0);
    assert.equal(r.next, 4);
  }
});
