// The Game page (/game, from the Home card): your level, the instance leaderboard and your badges.
// The board comes from the server (GET /api/game/leaderboard); the level and badges are worked
// out on this device, so they show offline and signed out too.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { fmtNum } from '../lib/format.js'
import { getLeaderboard } from '../lib/api.js'
import { gameOn, gameHidden, myGame, achievementCopy } from '../lib/game.js'
import { ACHIEVEMENTS, ACHIEVEMENT } from '../../../api/game/core/achievements.js'
import Icon from '../components/Icon.jsx'
import { Segmented } from '../components/ui.jsx'
import { GameBar, levelLine } from '../components/GameCard.jsx'

function Board({ S, signedIn }) {
  const [period, setPeriod] = useState('week')
  const [board, setBoard] = useState({ status: signedIn ? 'loading' : 'signed-out' })
  const [open, setOpen] = useState(null)
  useEffect(() => {
    if (!signedIn) { setBoard({ status: 'signed-out' }); return }
    let live = true
    setBoard(b => ({ ...b, status: 'loading' }))
    getLeaderboard(period)
      .then(r => { if (live) setBoard({ status: 'ok', ...r }) })
      .catch(() => { if (live) setBoard({ status: 'error' }) })
    return () => { live = false }
  }, [period, signedIn])

  return <div className="card" data-game-board>
    <h2 style={{ margin: '0 0 10px' }}>{t('Leaderboard')}</h2>
    <Segmented value={period} onChange={setPeriod}
      options={[{ value: 'week', label: t('This week') }, { value: 'all', label: t('All time') }]} />
    {board.status === 'signed-out' && <div className="muted small" style={{ marginTop: 10 }}>{t('Sign in to see the leaderboard.')}</div>}
    {board.status === 'error' && <div className="muted small" style={{ marginTop: 10 }}>{t('Can’t reach the server right now.')}</div>}
    {board.status === 'ok' && (board.hidden || gameHidden(S)) && <div className="muted small" style={{ marginTop: 10 }}>{t('You’re hidden from the leaderboard. Change this in Settings.')}</div>}
    {board.status === 'ok' && !board.rows.length && <div className="muted small" style={{ marginTop: 10 }}>{t('Nobody on the board yet. Finish a workout to get on it.')}</div>}
    {board.status === 'ok' && <div style={{ marginTop: 6 }} role="list">
      {board.rows.map((r, i) => <div key={i} role="listitem" className={'game-row' + (r.me ? ' me' : '')}>
        <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
          <span className="game-rank muted">{i + 1}</span>
          <span><span className="game-name">{r.name}</span><span className="muted small"> · {t('Level {0}', r.level)}{r.streak > 0 ? ' · ' + t('{0} week streak', r.streak) : ''}</span></span>
          <span className="game-pts">{t('{0} XP', fmtNum(r.xp))}</span>
        </button>
        {open === i && <div className="game-row-badges muted small">{r.achievements.length
          ? r.achievements.map(id => ACHIEVEMENT[id] && achievementCopy(ACHIEVEMENT[id], S.unit).title).filter(Boolean).join(' · ')
          : t('No badges yet.')}</div>}
      </div>)}
    </div>}
  </div>
}

export default function Game() {
  const nav = useNavigate()
  const S = useStore(s => s.S)
  const user = useStore(s => s.user)
  const on = gameOn(S)
  const sum = useMemo(() => (on ? myGame(S) : null), [on, S])
  const header = <div className="hdr"><button className="iconbtn" data-back="/home" onClick={() => nav('/home')} aria-label={t('Home')}><Icon name="chevronLeft" /></button>
    <div style={{ flex: 1, marginInlineStart: 12 }}><h1>{t('Levels and leaderboard')}</h1></div></div>
  if (!on) return <>{header}<div className="card muted">{t('Levels and leaderboard is switched off.')}</div></>
  const { level } = sum
  const got = new Set(sum.achievements.map(a => a.id))
  return <>
    {header}
    <div className="card" data-game-level>
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}>{t('Level {0}', level.level)}</h2>
        <span className="muted small">{t('{0} XP in total', fmtNum(level.xp))}</span>
      </div>
      <GameBar level={level} label={t('Level {0}', level.level)} />
      <div className="muted small" style={{ marginTop: 6 }}>{levelLine(level)}</div>
    </div>
    <Board S={S} signedIn={!!user} />
    <div className="card" data-game-badges>
      <h2 style={{ margin: '0 0 6px' }}>{t('Your badges')}</h2>
      <div className="muted small">{t('{0} of {1} unlocked', got.size, ACHIEVEMENTS.length)}</div>
      {ACHIEVEMENTS.map(a => {
        const c = achievementCopy(a, S.unit)
        return <div key={a.id} className={'game-badge' + (got.has(a.id) ? '' : ' locked')}>
          <span className="game-badge-i" aria-hidden="true"><Icon name={got.has(a.id) ? 'trophy' : 'lock'} /></span>
          <span><span>{c.title}</span><br /><span className="muted small">{c.desc}</span></span>
        </div>
      })}
    </div>
  </>
}
