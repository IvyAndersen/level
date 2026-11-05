// The game layer on the device: levels, XP, achievements and the switches around them. The rules
// live in api/game/core (shared with the leaderboard); this is the app's side of them.
//
// Stored on the profile, and nothing else:
//   S.gameHidden  true: not on the leaderboard, level and badges kept to yourself
//   S.gameSeen    { level, ach: [ids] }: what the finish summary already celebrated
// and on each finished workout: `gplan` (planned / extra / free, decided at finish against the
// plan of that day) and `loggedAt` (when it was saved, for the backdating rule).
import { isOn } from './modules.js'
import { todayISO, isoOf, fmtNum } from './format.js'
import { effectiveRoutineIds } from './history.js'
import { gameSummary } from '../../../api/game/core/summary.js'
import { LB_KG } from './units.js'
import { t } from './i18n.js'

export const gameOn = S => isOn(S, 'game')
export const gameHidden = S => S?.gameHidden === true || !gameOn(S)

/** Whether the profile has any plan at all: a weekday routine, a planner's queue or a rotation. */
function hasPlan(S) {
  const routines = new Set((Array.isArray(S?.routines) ? S.routines : []).map(r => r?.id))
  const week = S?.week && typeof S.week === 'object' ? S.week : {}
  if (Object.values(week).some(ids => [].concat(ids || []).some(id => routines.has(id)))) return true
  if (S?.rotation && typeof S.rotation === 'object') return true
  return Array.isArray(S?.queue?.ids) && S.queue.ids.length > 0
}

/**
 * What a workout was against the plan, read with the state from BEFORE it is saved (so a
 * rotation's next session in line is still this one): 'planned', 'extra', or 'free' (no plan).
 */
export function planKindOf(S, w) {
  if (!hasPlan(S)) return 'free'
  let planned = []
  try { planned = effectiveRoutineIds({ dayPlan: {}, week: {}, routines: [], ...S }, w.d) } catch { planned = [] }
  const done = [].concat(w?.routineIds || [])
  return done.some(id => planned.includes(id)) ? 'planned' : 'extra'
}

const seenDayOf = w => (Number.isFinite(w?.loggedAt) ? isoOf(new Date(w.loggedAt)) : null)

/** This profile's game: XP, level, week XP, streak, achievements, per-workout XP. */
export const myGame = (S, today = todayISO()) => gameSummary(S, { today, seenDayOf })

/**
 * What the finish summary should name now: a level reached and badges unlocked since S.gameSeen,
 * or null. A profile without S.gameSeen yet gets null: the caller seeds it quietly, so the
 * update itself does not set off a burst of old news.
 */
export function gameCelebration(S, sum) {
  const seen = S?.gameSeen
  if (!seen || typeof seen !== 'object') return null
  const had = new Set(Array.isArray(seen.ach) ? seen.ach : [])
  const achievements = sum.achievements.map(a => a.id).filter(id => !had.has(id))
  const level = sum.level.level > (Number(seen.level) || 1) ? sum.level.level : null
  if (!level && !achievements.length) return null
  return level ? { level, achievements } : { achievements }
}

/** What S.gameSeen becomes once `sum` was shown. */
export const seenOf = sum => ({ level: sum.level.level, ach: sum.achievements.map(a => a.id) })

/**
 * An achievement's name and line in the profile's unit: thresholds in kg become round pounds
 * for a lb profile (100 kg → 220 lb), so nobody reads "100 kg" against bars they load in lb.
 */
export function achievementCopy(a, unit = 'kg') {
  const w = kg => (unit === 'lb' ? `${fmtNum(Math.round(kg / LB_KG / 5) * 5)} lb` : `${fmtNum(kg)} kg`)
  if (a.group === 'lift') {
    const name = a.lift === 'bench' ? t('Bench press {0}', w(a.kg)) : a.lift === 'squat' ? t('Squat {0}', w(a.kg)) : t('Deadlift {0}', w(a.kg))
    return { title: name, desc: t('Lift {0} for at least one rep.', w(a.kg)) }
  }
  if (a.group === 'volume') return { title: t(a.title), desc: a.week ? t('Move {0} in one week.', w(a.kg)) : t('Move {0} in one workout.', w(a.kg)) }
  if (a.group === 'streak') return { title: t('{0} week streak', a.n), desc: t('Train 3 times a week, {0} weeks in a row.', a.n) }
  return { title: t(a.title), desc: t(a.desc) }
}
