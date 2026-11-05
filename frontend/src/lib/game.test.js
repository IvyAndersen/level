import { describe, expect, it } from 'vitest'
import { gameOn, gameHidden, planKindOf, myGame, gameCelebration } from './game.js'
import { mergeStates } from './sync-merge.js'

const routine = id => ({ id, name: id, ex: [{ id: '0025' }] })
// 2026-11-18 is a Wednesday (getDay 3).
const WED = '2026-11-18'

describe('the game switches', () => {
  it('is on unless the module is switched off', () => {
    expect(gameOn({})).toBe(true)
    expect(gameOn({ modules: { game: false } })).toBe(false)
  })
  it('hides with its own switch, or when the game is off', () => {
    expect(gameHidden({})).toBe(false)
    expect(gameHidden({ gameHidden: true })).toBe(true)
    expect(gameHidden({ modules: { game: false } })).toBe(true)
  })
})

describe('planKindOf', () => {
  const base = { routines: [routine('r1'), routine('r2')], week: {}, dayPlan: {}, queue: null, rotation: null }
  it('free without any plan', () => {
    expect(planKindOf(base, { d: WED, routineIds: [] })).toBe('free')
  })
  it('planned when it was the day’s routine, extra when not', () => {
    const S = { ...base, week: { 3: ['r1'] } }
    expect(planKindOf(S, { d: WED, routineIds: ['r1'] })).toBe('planned')
    expect(planKindOf(S, { d: WED, routineIds: ['r2'] })).toBe('extra')
    expect(planKindOf(S, { d: WED, routineIds: [] })).toBe('extra')
  })
  it('planned when moved to that day', () => {
    const S = { ...base, week: { 1: ['r2'] }, dayPlan: { [WED]: 'r2' } }
    expect(planKindOf(S, { d: WED, routineIds: ['r2'] })).toBe('planned')
  })
})

describe('myGame', () => {
  it('scores from the launch day with the stamp the workout carries', () => {
    const w = { id: 'a', d: '2026-11-17', loggedAt: new Date('2026-11-17T18:00:00').getTime(), gplan: 'planned', entries: [{ id: '0025', sets: [{ w: 60, r: 5, done: true }] }] }
    const sum = myGame({ workouts: [w] }, '2026-11-18')
    expect(sum.xp).toBe(100 + 5 + 50)
    const late = { ...w, loggedAt: new Date('2026-11-25T18:00:00').getTime() }
    expect(myGame({ workouts: [late] }, '2026-11-25').workouts[0].reason).toBe('backdated')
  })
})

describe('gameCelebration', () => {
  const sum = (level, ids) => ({ level: { level }, achievements: ids.map(id => ({ id })) })
  it('says nothing to a profile that never saw one (the caller seeds it quietly)', () => {
    expect(gameCelebration({}, sum(3, ['pr-1']))).toBeNull()
  })
  it('names a new level and new badges once', () => {
    const S = { gameSeen: { level: 2, ach: ['pr-1'] } }
    expect(gameCelebration(S, sum(3, ['pr-1']))).toEqual({ level: 3, achievements: [] })
    expect(gameCelebration(S, sum(2, ['pr-1', 'bench-60']))).toEqual({ achievements: ['bench-60'] })
    expect(gameCelebration(S, sum(2, ['pr-1']))).toBeNull()
  })
})

describe('sync', () => {
  it('keeps gameSeen and gameHidden, and the stamps on a workout, through a merge', () => {
    const w = { id: 'a', d: WED, gplan: 'extra', loggedAt: 123, entries: [] }
    const a = { workouts: [w], gameHidden: true, gameSeen: { level: 2, ach: ['pr-1'] }, edited: { gameHidden: 2, gameSeen: 2 } }
    const b = { workouts: [], edited: {} }
    const m = mergeStates(a, b)
    expect(m.gameHidden).toBe(true)
    expect(m.gameSeen).toEqual({ level: 2, ach: ['pr-1'] })
    expect(m.workouts.find(x => x.id === 'a')).toMatchObject({ gplan: 'extra', loggedAt: 123 })
  })
})
