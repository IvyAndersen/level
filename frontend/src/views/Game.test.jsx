// @vitest-environment happy-dom
// The Game page (views/Game.jsx): level, the leaderboard from the server, the badges.
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { DEF, useStore } from '../store/useStore.js'

const getLeaderboard = vi.fn()
vi.mock('../lib/api.js', async orig => ({ ...(await orig()), getLeaderboard: (...a) => getLeaderboard(...a) }))
const { default: Game } = await import('./Game.jsx')

const clone = v => JSON.parse(JSON.stringify(v))
let root, host
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
const render = async () => { act(() => root.render(<MemoryRouter><Game /></MemoryRouter>)); await flush(); return host }
const rows = [
  { name: 'Ana', level: 3, xp: 900, streak: 2, achievements: ['workouts-1', 'bench-60'], me: false },
  { name: 'Ben', level: 2, xp: 400, streak: 0, achievements: [], me: true },
]

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  getLeaderboard.mockReset()
  useStore.setState({ S: clone(DEF), user: { id: 'u_b', name: 'Ben' } })
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('the Game page', () => {
  it('lists the board in order, and expands a row to its badges', async () => {
    getLeaderboard.mockResolvedValue({ launch: '2026-11-16', period: 'week', week: '2026-11-16', hidden: false, rows })
    const el = await render()
    expect(getLeaderboard).toHaveBeenCalledWith('week')
    const names = [...el.querySelectorAll('.game-row .game-name')].map(n => n.textContent)
    expect(names).toEqual(['Ana', 'Ben'])
    act(() => el.querySelector('.game-row button').click())
    expect(el.querySelector('.game-row-badges').textContent).toContain('First workout')
  })
  it('switches to all time', async () => {
    getLeaderboard.mockResolvedValue({ launch: '2026-11-16', period: 'week', week: '2026-11-16', hidden: false, rows })
    const el = await render()
    act(() => [...el.querySelectorAll('.seg button')].find(b => b.textContent === 'All time').click())
    await flush()
    expect(getLeaderboard).toHaveBeenLastCalledWith('all')
  })
  it('says when you are hidden', async () => {
    getLeaderboard.mockResolvedValue({ launch: '2026-11-16', period: 'week', week: '2026-11-16', hidden: true, rows: rows.slice(0, 1) })
    const el = await render()
    expect(el.textContent).toContain('You’re hidden from the leaderboard. Change this in Settings.')
  })
  it('offline: says so, and still shows the badges from this device', async () => {
    getLeaderboard.mockRejectedValue(new Error('offline'))
    const el = await render()
    expect(el.textContent).toContain('Can’t reach the server right now.')
    expect(el.querySelectorAll('.game-badge').length).toBeGreaterThan(10)
  })
  it('signed out: no request, a line instead of the board', async () => {
    useStore.setState({ user: null })
    const el = await render()
    expect(getLeaderboard).not.toHaveBeenCalled()
    expect(el.textContent).toContain('Sign in to see the leaderboard.')
  })
  it('is gone with the module off', async () => {
    useStore.setState({ S: { ...clone(DEF), modules: { game: false } } })
    const el = await render()
    expect(el.querySelector('.game-row')).toBeNull()
    expect(el.textContent).toContain('Levels and leaderboard is switched off.')
  })
})
