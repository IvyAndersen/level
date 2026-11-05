// The game on Home: your level and the bar to the next, one tap from the Game page. The streak is
// not repeated here: it has its own card right next to this one.
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { gameOn, myGame } from '../lib/game.js'
import CardHead from './CardHead.jsx'
import Icon from './Icon.jsx'

/** The level bar: fills to `pct` (0..1) once, under a second (index.css .game-bar). */
export function GameBar({ level, label }) {
  return <div className="pbar game-bar" role="progressbar" aria-label={label}
    aria-valuemin={0} aria-valuemax={level.need} aria-valuenow={level.into}>
    <i style={{ '--p': level.pct }} />
  </div>
}

export const levelLine = level => t('{0} / {1} XP', fmtNum(level.into), fmtNum(level.need))

export default function GameCard({ S }) {
  const nav = useNavigate()
  const on = gameOn(S)
  const sum = useMemo(() => (on ? myGame(S) : null), [on, S])
  if (!on) return null
  const { level } = sum
  return <div className="card tap-host game-card" data-game-card>
    <CardHead icon="trophy" tint="var(--yellow)" title={t('Level {0}', level.level)}
      sub={levelLine(level)} open={{ onClick: () => nav('/game') }}
      action={<Icon name="chevronRight" className="chev" />} />
    <GameBar level={level} label={t('Level {0}', level.level)} />
  </div>
}
