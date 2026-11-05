// The game layer's core (api/game/core): the level curve and the week keys it is built on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { xpToReach, levelOf } from '../game/core/levels.js';
import { weekKeyOf, plusWeeks, dayDiff } from '../game/core/week.js';

const CORE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'core');

test('xpToReach: 0 for level 1, then 500, 750, 1000… more each level', () => {
  assert.equal(xpToReach(1), 0);
  assert.equal(xpToReach(2), 500);
  assert.equal(xpToReach(3), 1250);
  assert.equal(xpToReach(10), 13500);
});

test('levelOf: the level, the XP into it and the span to the next', () => {
  assert.deepEqual(levelOf(0), { level: 1, xp: 0, into: 0, need: 500, pct: 0 });
  assert.equal(levelOf(499).level, 1);
  const two = levelOf(500);
  assert.equal(two.level, 2);
  assert.equal(two.into, 0);
  assert.equal(two.need, 750);
  assert.equal(levelOf(875).pct, 0.5);
  assert.equal(levelOf(-5).level, 1);
  assert.equal(levelOf(NaN).level, 1);
});

test('weekKeyOf: the first day of the week, Monday or Sunday first', () => {
  assert.equal(weekKeyOf('2026-11-05', 1), '2026-11-02');
  assert.equal(weekKeyOf('2026-11-05', 0), '2026-11-01');
  assert.equal(weekKeyOf('2026-11-08', 1), '2026-11-02');
  assert.equal(weekKeyOf('2026-11-08', 0), '2026-11-08');
  assert.equal(plusWeeks('2026-11-02', 1), '2026-11-09');
  assert.equal(plusWeeks('2026-11-02', -1), '2026-10-26');
  assert.equal(dayDiff('2026-11-01', '2026-11-05'), 4);
  assert.equal(dayDiff('2026-11-05', '2026-11-01'), -4);
  assert.equal(dayDiff('2026-03-28', '2026-03-30'), 2); // across a DST change
});

test('the core imports nothing from outside api/game/core', () => {
  for (const f of fs.readdirSync(CORE).filter(f => f.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(CORE, f), 'utf8');
    for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(m[1].startsWith('./') && !m[1].slice(2).includes('/'), `${f} imports ${m[1]}`);
    }
  }
});
