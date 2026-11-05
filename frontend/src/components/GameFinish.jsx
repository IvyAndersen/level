// The game's block on the finish summary: what this workout earned and how, the level bar, and a
// line for a level or badge it brought. Read in a couple of seconds; the summary's own Nice!
// still closes it, so the game adds no tap. What it celebrated is remembered (S.gameSeen) the
// moment it is shown, so it says it once.
import { useEffect, useState } from 'react'
import { t } from '../lib/i18n.js'
import { fmtNum, fmtDate } from '../lib/format.js'
import { useStore } from '../store/useStore.js'
import { gameOn, myGame, gameCelebration, seenOf, achievementCopy } from '../lib/game.js'
import { ACHIEVEMENT } from '../../../api/game/core/achievements.js'
import { LAUNCH } from '../../../api/game/core/rules.js'
import { GameBar, levelLine } from './GameCard.jsx'

export default function GameFinish({ S, w }) {
  const on = gameOn(S)
  // Worked out once, when the summary opens: the celebration must not vanish when S.gameSeen
  // changes under it a moment later.
  const [view] = useState(() => {
    if (!on) return null
    const sum = myGame(S)
    return { sum, me: sum.workouts.find(x => x.id === w.id) || null, party: gameCelebration(S, sum) }
  })
  const update = useStore(s => s.update)
  useEffect(() => {
    if (view) update(s => { s.gameSeen = seenOf(view.sum) })
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps
  if (!view) return null
  const { sum, me, party } = view
  const { level } = sum

  let head, line = null
  if (!me && w.d < LAUNCH) head = t('XP starts on {0}.', fmtDate(LAUNCH))
  else if (!me) head = null
  else if (me.reason === 'backdated') head = t('Logged too long after the day, so no XP.')
  else {
    head = t('+{0} XP', fmtNum(me.xp))
    line = t('Workout {0} · Sets {1} · PRs {2} · Bonus {3}', me.parts.workout, me.parts.sets, me.parts.prs, me.parts.bonus)
  }
  if (!head) return null
  return <div className="game-finish" data-game-finish style={{ textAlign: 'start', marginBottom: 12 }}>
    <div className="row between" style={{ alignItems: 'baseline' }}>
      <strong className="game-xp">{head}</strong>
      <span className="muted small">{t('Level {0}', level.level)} · {levelLine(level)}</span>
    </div>
    {line && <div className="muted small">{line}</div>}
    {me?.capped && <div className="muted small">{t('Daily XP limit reached.')}</div>}
    <GameBar level={level} label={t('Level {0}', level.level)} />
    {party?.level && <div className="small accent">{t('Level {0} reached.', party.level)}</div>}
    {(party?.achievements || []).map(id => ACHIEVEMENT[id] &&
      <div key={id} className="small accent">{t('New badge: {0}', achievementCopy(ACHIEVEMENT[id], S.unit).title)}</div>)}
  </div>
}
