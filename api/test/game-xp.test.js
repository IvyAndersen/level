// XP from workouts (api/game/core/xp.js): what one workout earns, the bonuses, the day cap and the
// backdating rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreWorkouts } from '../game/core/xp.js';

const L = '2026-11-16'; // launch, a Monday
let seq = 0;
// A workout on day `d` with `sets` done work sets, `warmups` done warm-ups and `prs` PRs.
const wk = (d, { sets = 10, warmups = 0, prs = 0, gplan, start } = {}) => ({
  id: 'w' + (++seq), d, start: start ?? seq,
  prs: Array.from({ length: prs }, (_, i) => 'ex' + i),
  ...(gplan ? { gplan } : {}),
  entries: [{ id: '0025', sets: [
    ...Array.from({ length: warmups }, () => ({ w: 20, r: 5, done: true, phase: 'warmup' })),
    ...Array.from({ length: sets }, () => ({ w: 60, r: 5, done: true })),
  ] }],
});
const score = (workouts, over = {}) => scoreWorkouts({ workouts, weekStart: 1, ...over }, { launch: L, seenDayOf: () => null });
const total = r => r.reduce((n, x) => n + x.xp, 0);

test('a planned workout: 100 + sets + PRs + the planned bonus', () => {
  const [r] = score([wk('2026-11-17', { sets: 10, prs: 1, gplan: 'planned' })]);
  assert.deepEqual(r.parts, { workout: 100, sets: 50, prs: 40, bonus: 50 });
  assert.equal(r.xp, 240);
  assert.equal(r.kind, 'planned');
});

test('warm-ups only, or nothing done, earns nothing', () => {
  assert.equal(total(score([wk('2026-11-17', { sets: 0, warmups: 3 })])), 0);
  assert.equal(total(score([{ id: 'e', d: '2026-11-17', entries: [] }])), 0);
  const undone = wk('2026-11-17', { sets: 2 });
  undone.entries[0].sets.forEach(s => { s.done = false; });
  assert.equal(total(score([undone])), 0);
});

test('sets count up to 30, PRs up to 5', () => {
  const [r] = score([wk('2026-11-17', { sets: 40, prs: 8, gplan: 'planned' })]);
  assert.equal(r.parts.sets, 150);
  assert.equal(r.parts.prs, 200);
});

test('extra sessions: the bonus once a day', () => {
  const r = score([wk('2026-11-17', { sets: 1, gplan: 'extra' }), wk('2026-11-17', { sets: 1, gplan: 'extra' })]);
  assert.deepEqual(r.map(x => x.parts.bonus), [25, 0]);
  assert.deepEqual(r.map(x => x.kind), ['extra', 'extra']);
});

test('without a plan, the first 3 workouts of the week count as planned', () => {
  const r = score(['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map(d => wk(d, { sets: 1 })));
  assert.deepEqual(r.map(x => x.kind), ['planned', 'planned', 'planned', 'extra']);
  assert.deepEqual(r.map(x => x.parts.bonus), [50, 50, 50, 25]);
  // a workout from an older build without the stamp is read as free too
  assert.equal(score([wk('2026-11-17', { sets: 1, gplan: 'free' })])[0].kind, 'planned');
});

test('free weeks follow the profile: a Sunday is a new week for Sunday-first', () => {
  const days = ['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22']; // Thu Fri Sat Sun
  assert.equal(score(days.map(d => wk(d, { sets: 1 })), { weekStart: 1 })[3].kind, 'extra');
  assert.equal(score(days.map(d => wk(d, { sets: 1 })), { weekStart: 0 })[3].kind, 'planned');
});

test('a day earns 500 at most; the workout that crosses it is cut', () => {
  const r = score([1, 2, 3].map(i => wk('2026-11-17', { sets: 30, prs: 2, gplan: 'planned', start: i })));
  assert.equal(total(r), 500);
  assert.equal(r[2].xp, 0);
  assert.equal(r[1].capped, true);
  assert.equal(r[0].capped, false);
});

test('backdated: first seen more than 3 days after its day earns nothing', () => {
  const w = wk('2026-11-20', { gplan: 'planned' });
  const far = scoreWorkouts({ workouts: [w] }, { launch: L, seenDayOf: () => '2026-11-25' });
  assert.equal(far[0].xp, 0);
  assert.equal(far[0].reason, 'backdated');
  const near = scoreWorkouts({ workouts: [w] }, { launch: L, seenDayOf: () => '2026-11-23' });
  assert.ok(near[0].xp > 0);
});

test('before the launch day: not scored', () => {
  assert.equal(score([wk('2026-11-15', { gplan: 'planned' })]).length, 0);
});

test('deleting a workout takes exactly its XP away', () => {
  const a = wk('2026-11-17', { gplan: 'planned' });
  const b = wk('2026-11-18', { gplan: 'planned', prs: 2 });
  const both = score([a, b]);
  const one = score([a]);
  assert.equal(total(both) - total(one), both.find(x => x.id === b.id).xp);
});

test('a per-side set with one side done counts as one set', () => {
  const w = { id: 'ps', d: '2026-11-17', gplan: 'planned', entries: [{ id: 'x', sets: [{ side: true, sides: { L: { w: 10, r: 8, done: true }, R: { w: 10, r: 8, done: false } } }] }] };
  assert.equal(score([w])[0].parts.sets, 5);
});

test('sorted by day, then start; junk entries are skipped', () => {
  const r = score([wk('2026-11-18'), null, 'x', wk('2026-11-17'), { id: 'z', d: 'nope', entries: [] }]);
  assert.deepEqual(r.map(x => x.d), ['2026-11-17', '2026-11-18']);
});
