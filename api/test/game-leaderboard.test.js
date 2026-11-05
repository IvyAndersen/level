// The leaderboard (api/game/leaderboard.js): the first-seen ledger, who is listed and what a row
// may say. The second half runs the real server.js and asks GET /api/game/leaderboard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundPort } from './helpers.mjs';
import { updateSeen, isListed, leaderboardRows } from '../game/leaderboard.js';
import { LAUNCH } from '../game/core/rules.js';
import { plusWeeks, weekKeyOf, isoOfDate } from '../game/core/week.js';

const workout = (id, d, sets = 10) => ({ id, d, gplan: 'planned', entries: [{ id: '0025', sets: Array.from({ length: sets }, () => ({ w: 60, r: 5, done: true })) }] });
const user = (id, name, S, ledger = { v: 1, seen: {} }) => ({ id, name, S, ledger });

test('updateSeen: a new ledger trusts every workout already there; later ones get today', () => {
  const first = updateSeen(null, [{ id: 'a', d: '2026-10-01' }], '2026-11-20');
  assert.equal(first.ledger.seen.a, '2026-10-01');
  assert.equal(first.changed, true);
  const next = updateSeen(first.ledger, [{ id: 'a', d: '2026-10-01' }, { id: 'b', d: '2026-11-01' }], '2026-11-20');
  assert.equal(next.ledger.seen.b, '2026-11-20');
  assert.equal(next.ledger.seen.a, '2026-10-01');
  const same = updateSeen(next.ledger, [{ id: 'a', d: '2026-10-01' }, { id: 'b', d: '2026-11-01' }], '2026-11-21');
  assert.equal(same.changed, false);
  const gone = updateSeen(next.ledger, [{ id: 'a', d: '2026-10-01' }], '2026-11-21');
  assert.equal('b' in gone.ledger.seen, false);
  assert.equal(gone.changed, true);
  assert.equal(updateSeen(null, null, '2026-11-20').ledger.v, 1);
});

test('isListed: off with the hide switch or the module off', () => {
  assert.equal(isListed({}), true);
  assert.equal(isListed(null), true);
  assert.equal(isListed({ gameHidden: true }), false);
  assert.equal(isListed({ modules: { game: false } }), false);
});

const day = (n) => { const d = new Date(LAUNCH + 'T12:00:00'); d.setDate(d.getDate() + n); return isoOfDate(d); };

test('rows: hidden users absent, sorted by XP then name, exactly the allowed keys', () => {
  const today = day(2);
  const rows = leaderboardRows([
    user('u1', 'Bea', { workouts: [workout('a', day(0))] }),
    user('u2', 'Al', { workouts: [workout('b', day(0))] }),
    user('u3', 'Cy', { workouts: [workout('c', day(0)), workout('d', day(1))] }),
    user('u4', 'Hidden', { gameHidden: true, workouts: [workout('e', day(0))] }),
    user('u5', 'Off', { modules: { game: false }, workouts: [workout('f', day(0))] }),
  ], { period: 'all', today, meId: 'u2' });
  assert.deepEqual(rows.map(r => r.name), ['Cy', 'Al', 'Bea']);
  for (const r of rows) assert.deepEqual(Object.keys(r).sort(), ['achievements', 'level', 'me', 'name', 'streak', 'xp']);
  assert.deepEqual(rows.map(r => r.me), [false, true, false]);
  assert.ok(rows[1].achievements.includes('workouts-1'));
});

test('week: XP of the Monday week on the board, whatever week start the profile uses', () => {
  // LAUNCH is a Monday; day(6) is the Sunday that ends that Monday week.
  const sunday = day(6);
  assert.equal(weekKeyOf(sunday, 1), LAUNCH);
  const S = { weekStart: 0, workouts: [workout('s', sunday)] };
  const [inWeek] = leaderboardRows([user('u', 'Sun', S)], { period: 'week', today: sunday, meId: 'x' });
  assert.ok(inWeek.xp > 0);
  const [next] = leaderboardRows([user('u', 'Sun', S)], { period: 'week', today: plusWeeks(LAUNCH, 1), meId: 'x' });
  assert.equal(next.xp, 0);
});

test('backdating comes from the ledger', () => {
  const S = { workouts: [workout('late', day(0))] };
  const [r] = leaderboardRows([user('u', 'Late', S, { v: 1, seen: { late: day(10) } })], { period: 'all', today: day(10), meId: 'x' });
  assert.equal(r.xp, 0);
});

/* ---------- the route, in a real server ---------- */

const API = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SECRET = crypto.randomBytes(32).toString('hex');
function mintSession(uid, sv = 0) {
  const payload = `${uid}:${Date.now() + 86400000}:${sv}`;
  return payload + '.' + crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
}
const headers = uid => ({ Cookie: `gymsid=${mintSession(uid)}`, 'Content-Type': 'application/json', Origin: 'http://localhost:8080' });

async function startServer(t, users, states) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-game-'));
  fs.writeFileSync(path.join(dataDir, 'secret'), SECRET, { mode: 0o600 });
  fs.writeFileSync(path.join(dataDir, 'db.json'), JSON.stringify({ users, creds: [], subs: [], invites: [] }));
  for (const [uid, S] of Object.entries(states)) fs.writeFileSync(path.join(dataDir, `state-${uid}.json`), JSON.stringify(S));
  const child = spawn(process.execPath, ['server.js'], {
    cwd: API, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: '0', DATA_DIR: dataDir, ORIGIN: 'http://localhost:8080', RP_ID: 'localhost' },
  });
  const h = { log: '', dataDir };
  child.stdout.on('data', d => h.log += d);
  child.stderr.on('data', d => h.log += d);
  t.after(() => { child.kill('SIGKILL'); fs.rmSync(dataDir, { recursive: true, force: true }); });
  h.api = `http://127.0.0.1:${await boundPort(child, () => h.log)}`;
  return h;
}

test('GET /api/game/leaderboard: signed in only, two periods, the disabled and hidden left out', async t => {
  const created = new Date().toISOString();
  const today = isoOfDate(new Date());
  const d = today >= LAUNCH ? today : LAUNCH; // a workout the board counts whatever today is
  const h = await startServer(t, [
    { id: 'u_a', name: 'Ana', created }, { id: 'u_b', name: 'Ben', created },
    { id: 'u_c', name: 'Cal', created, disabled: true }, { id: 'u_d', name: 'Dee', created },
  ], {
    u_a: { workouts: [workout('a1', d)] },
    u_b: { workouts: [] },
    u_c: { workouts: [workout('c1', d)] },
    u_d: { gameHidden: true, workouts: [workout('d1', d)] },
  });
  assert.equal((await fetch(h.api + '/api/game/leaderboard')).status, 401);
  assert.equal((await fetch(h.api + '/api/game/leaderboard?period=year', { headers: headers('u_a') })).status, 400);
  const all = await (await fetch(h.api + '/api/game/leaderboard?period=all', { headers: headers('u_a') })).json();
  assert.equal(all.period, 'all');
  assert.equal(all.launch, LAUNCH);
  assert.equal(all.hidden, false);
  assert.deepEqual(all.rows.map(r => r.name), ['Ana', 'Ben']);
  assert.equal(all.rows[0].me, true);
  assert.ok(all.rows[0].xp > 0);
  const hid = await (await fetch(h.api + '/api/game/leaderboard', { headers: headers('u_d') })).json();
  assert.equal(hid.period, 'week');
  assert.equal(hid.hidden, true);
  assert.ok(!hid.rows.some(r => r.name === 'Dee'));
});

test('PUT /api/data keeps the game stamps on a workout and starts the first-seen ledger', async t => {
  const h = await startServer(t, [{ id: 'u_p', name: 'Pat', created: new Date().toISOString() }], {});
  const w = { ...workout('p1', '2026-12-01'), gplan: 'extra', loggedAt: 1790000000000 };
  const put = await fetch(h.api + '/api/data', { method: 'PUT', headers: headers('u_p'), body: JSON.stringify({ state: { workouts: [w] } }) });
  assert.equal(put.status, 200, h.log);
  const got = await (await fetch(h.api + '/api/data', { headers: headers('u_p') })).json();
  assert.equal(got.state.workouts[0].gplan, 'extra');
  assert.equal(got.state.workouts[0].loggedAt, 1790000000000);
  const ledger = JSON.parse(fs.readFileSync(path.join(h.dataDir, 'game-seen-u_p.json'), 'utf8'));
  assert.equal(ledger.seen.p1, '2026-12-01');
});
