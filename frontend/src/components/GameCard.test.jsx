// @vitest-environment happy-dom
// The game's Home card and the finish summary's XP block (components/GameCard.jsx, GameFinish.jsx).
import React, { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { DEF, useStore } from '../store/useStore.js'
import GameCard from './GameCard.jsx'
import GameFinish from './GameFinish.jsx'

const clone = v => JSON.parse(JSON.stringify(v))
let root, host
const render = node => { act(() => root.render(<MemoryRouter>{node}</MemoryRouter>)); return host }
// A planned workout of 10 done sets and 1 PR after launch: 100 + 50 + 40 + 50 = 240 XP.
const W = (id, d, over = {}) => ({ id, d, gplan: 'planned', loggedAt: new Date(d + 'T18:00:00').getTime(), prs: ['0025'], entries: [{ id: '0025', sets: Array.from({ length: 10 }, () => ({ w: 60, r: 5, done: true })) }], ...over })
const state = over => ({ ...clone(DEF), ...over })

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('GameCard', () => {
  it('shows the level and the bar to the next', () => {
    // 3 workouts of 240 = 720 XP: level 2 (500), 220 of 750 into it.
    const S = state({ workouts: [W('a', '2026-11-17'), W('b', '2026-11-18'), W('c', '2026-11-19')] })
    const el = render(<GameCard S={S} />)
    expect(el.textContent).toContain('Level 2')
    expect(el.textContent).toContain('220 / 750 XP')
    expect(el.querySelector('.game-bar i').style.getPropertyValue('--p')).toBe(String(220 / 750))
  })
  it('is gone with the module off', () => {
    const el = render(<GameCard S={state({ modules: { game: false } })} />)
    expect(el.textContent).toBe('')
  })
})

describe('GameFinish', () => {
  beforeEach(() => useStore.setState({ S: state({}), user: null }))
  it('says what the workout earned and how', () => {
    const w = W('a', '2026-11-17')
    const S = state({ workouts: [w] })
    const el = render(<GameFinish S={S} w={w} />)
    expect(el.textContent).toContain('+240 XP')
    expect(el.textContent).toContain('Workout 100')
    expect(el.textContent).toContain('Bonus 50')
  })
  it('names a backdated workout plainly', () => {
    const w = W('a', '2026-11-17', { loggedAt: new Date('2026-11-25T10:00:00').getTime() })
    const el = render(<GameFinish S={state({ workouts: [w] })} w={w} />)
    expect(el.textContent).toContain('Logged too long after the day, so no XP.')
  })
  it('says when the game starts for a workout before launch', () => {
    const w = W('a', '2026-11-10')
    const el = render(<GameFinish S={state({ workouts: [w] })} w={w} />)
    expect(el.textContent).toMatch(/XP starts on/)
  })
  it('names a new level and badge once, and remembers it was shown', () => {
    const w = W('c', '2026-11-19')
    const S = state({ gameSeen: { level: 1, ach: [] }, workouts: [W('a', '2026-11-17'), W('b', '2026-11-18'), w] })
    useStore.setState({ S })
    const el = render(<GameFinish S={S} w={w} />)
    expect(el.textContent).toContain('Level 2 reached.')
    expect(el.textContent).toContain('New badge: First workout')
    expect(useStore.getState().S.gameSeen.level).toBe(2)
  })
  it('is gone with the module off', () => {
    const w = W('a', '2026-11-17')
    expect(render(<GameFinish S={state({ modules: { game: false }, workouts: [w] })} w={w} />).textContent).toBe('')
  })
})

describe('motion', () => {
  it('the bar fills in under a second, and reduced motion turns every transition off', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')
    const rule = css.match(/\.game-bar i\{[^}]*transition:[^;}]*?(\.\d+|\d+(?:\.\d+)?)s/)
    expect(rule).toBeTruthy()
    expect(Number(rule[1])).toBeLessThanOrEqual(0.6)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\{\*\{animation:none!important;transition:none!important\}\}/)
  })
})
