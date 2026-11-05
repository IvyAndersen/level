// Achievements (api/game/core/achievements.js) and the one summary both sides read (summary.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, unlockedAchievements } from '../game/core/achievements.js';
import { gameSummary } from '../game/core/summary.js';

const L = '2026-11-16';
const lift = (d, exId, w, r = 1, extra = {}) => ({ id: `${exId}-${d}-${w}`, d, entries: [{ id: exId, sets: [{ w, r, done: true, ...extra }] }] });
const ids = (S, opts = {}) => unlockedAchievements(S, { launch: L, streakBest: 0, ...opts }).map(a => a.id);

test('the catalogue: unique ids, each with a group, a title and a description', () => {
  const seen = new Set();
  for (const a of ACHIEVEMENTS) {
    assert.ok(!seen.has(a.id), a.id);
    seen.add(a.id);
    assert.ok(['lift', 'relative', 'volume', 'prs', 'streak', 'workouts'].includes(a.group), a.id);
    assert.ok(a.title && a.desc, a.id);
    assert.ok(!/—/.test(a.title + a.desc), `${a.id} has an em dash`);
  }
  assert.ok(ACHIEVEMENTS.length >= 20);
});

test('a 100 kg bench unlocks 40, 60, 80 and 100, not 120', () => {
  const got = ids({ unit: 'kg', workouts: [lift('2026-11-17', '0025', 100)] });
  for (const id of ['bench-40', 'bench-60', 'bench-80', 'bench-100']) assert.ok(got.includes(id), id);
  assert.ok(!got.includes('bench-120'));
});

test('lb profiles: a 225 lb bench is 102 kg, so bench-100', () => {
  const got = ids({ unit: 'lb', workouts: [lift('2026-11-17', '0025', 225)] });
  assert.ok(got.includes('bench-100'));
  assert.ok(!got.includes('bench-120'));
});

test('warm-ups, sets with no reps and workouts before launch unlock nothing', () => {
  assert.ok(!ids({ workouts: [lift('2026-11-17', '0025', 140, 3, { phase: 'warmup' })] }).includes('bench-40'));
  assert.ok(!ids({ workouts: [lift('2026-11-17', '0025', 140, 0)] }).includes('bench-40'));
  assert.ok(!ids({ workouts: [lift('2026-11-10', '0025', 140)] }).includes('bench-40'));
});

test('squat and deadlift count every id of the lift', () => {
  const got = ids({ workouts: [lift('2026-11-17', '3593', 100), lift('2026-11-18', '0117', 140)] });
  assert.ok(got.includes('squat-100'));
  assert.ok(got.includes('deadlift-140'));
});

test('relative: needs a weigh-in on or before the day', () => {
  const w = lift('2026-11-17', '0025', 80);
  assert.ok(ids({ workouts: [w], bodyweight: [{ d: '2026-11-10', w: 80 }] }).includes('rel-bench-1x'));
  assert.ok(!ids({ workouts: [w], bodyweight: [{ d: '2026-11-20', w: 80 }] }).includes('rel-bench-1x'));
  assert.ok(!ids({ workouts: [w] }).includes('rel-bench-1x'));
  assert.ok(!ids({ workouts: [w], bodyweight: [{ d: '2026-11-10', w: 90 }] }).includes('rel-bench-1x'));
});

test('volume in kg: 5 × 5 × 225 lb is about 2551 kg', () => {
  const w = { id: 'v', d: '2026-11-17', entries: [{ id: '0025', sets: Array.from({ length: 5 }, () => ({ w: 225, r: 5, done: true })) }] };
  const got = ids({ unit: 'lb', workouts: [w] });
  assert.ok(got.includes('vol-session-1000'));
  assert.ok(!got.includes('vol-session-5000'));
});

test('a week of 10,000 kg across workouts', () => {
  const big = d => ({ id: d, d, entries: [{ id: 'x', sets: Array.from({ length: 10 }, () => ({ w: 100, r: 5, done: true })) }] });
  assert.ok(ids({ workouts: ['2026-11-16', '2026-11-18'].map(big) }).includes('vol-week-10000'));
  assert.ok(!ids({ workouts: ['2026-11-22', '2026-11-23'].map(big) }).includes('vol-week-10000')); // Sunday + Monday
});

test('PR counts, workout counts and the streak best', () => {
  const ws = Array.from({ length: 10 }, (_, i) => ({ ...lift(`2026-11-${17 + i}`, 'x', 10), prs: ['a'] }));
  const got = ids({ workouts: ws }, { streakBest: 4 });
  for (const id of ['pr-1', 'pr-10', 'workouts-1', 'workouts-10', 'streak-4']) assert.ok(got.includes(id), id);
  assert.ok(!got.includes('streak-12'));
});

test('the day it was unlocked is the workout that first met it', () => {
  const S = { workouts: [lift('2026-11-17', '0025', 60), lift('2026-11-20', '0025', 100)] };
  const by = Object.fromEntries(unlockedAchievements(S, { launch: L }).map(a => [a.id, a.d]));
  assert.equal(by['bench-60'], '2026-11-17');
  assert.equal(by['bench-100'], '2026-11-20');
});

test('deleting the workout takes the badge back', () => {
  const heavy = lift('2026-11-20', '0025', 100);
  assert.ok(ids({ workouts: [lift('2026-11-17', '0025', 60), heavy] }).includes('bench-100'));
  assert.ok(!ids({ workouts: [lift('2026-11-17', '0025', 60)] }).includes('bench-100'));
});

test('gameSummary: XP, level, Monday-keyed week XP, the profile-week streak', () => {
  const ws = ['2026-11-22', '2026-11-23'].map(d => ({ ...lift(d, '0025', 60), gplan: 'planned' })); // Sun, Mon
  const sum = gameSummary({ weekStart: 0, workouts: ws }, { today: '2026-11-24', launch: L });
  assert.equal(sum.xp, sum.workouts.reduce((n, w) => n + w.xp, 0));
  assert.deepEqual(Object.keys(sum.weekXp).sort(), ['2026-11-16', '2026-11-23']);
  assert.equal(sum.streak.weekKey, '2026-11-22');
  assert.equal(sum.level.level, 1);
  assert.ok(sum.achievements.some(a => a.id === 'workouts-1'));
});

test('gameSummary: sessions with no done work do not count for the streak', () => {
  const empty = d => ({ id: 'e' + d + Math.random(), d, entries: [] });
  const warm = d => ({ id: 'w' + d + Math.random(), d, entries: [{ id: 'x', sets: [{ w: 20, r: 5, done: true, phase: 'warmup' }] }] });
  const sum = gameSummary({ workouts: [empty('2026-11-17'), warm('2026-11-17'), empty('2026-11-18')] }, { today: '2026-11-24', launch: L });
  assert.equal(sum.xp, 0);
  assert.equal(sum.streak.best, 0);
});

test('gameSummary on an empty or broken profile', () => {
  for (const S of [{}, { workouts: null }, null]) {
    const sum = gameSummary(S, { today: '2026-11-24', launch: L });
    assert.equal(sum.xp, 0);
    assert.equal(sum.level.level, 1);
    assert.deepEqual(sum.achievements, []);
  }
});
