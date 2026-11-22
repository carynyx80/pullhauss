import { ReactNode, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Gate, ROOMS, Shape } from '../components/common'
import { useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { CLUSTER } from '../lib/config'
import { fmt, load, save, short, usd } from '../lib/util'
import Vault from '../rooms/Vault'
import Send from '../rooms/Send'
import Swap from '../rooms/Swap'
import Forge from '../rooms/Forge'
import Links from '../rooms/Links'
import Orders from '../rooms/Orders'
import Stealth from '../rooms/Stealth'
import Proofs from '../rooms/Proofs'
import Activity from '../rooms/Activity'

const COMP: Record<string, () => JSX.Element> = { vault: Vault, send: Send, swap: Swap, forge: Forge, links: Links, orders: Orders, stealth: Stealth, proofs: Proofs }

const SIDE_KEY = 'pullhaus.sidebar.collapsed'

export default function AppShell() {
  const { connected, address, disconnect, shielded, prices, reset } = useStore()
  const live = useLive()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState<boolean>(() => load(SIDE_KEY, false))
  const [drawer, setDrawer] = useState(false)
  useEffect(() => save(SIDE_KEY, collapsed), [collapsed])
  useEffect(() => setDrawer(false), [loc.pathname])
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  const LIVE_ROOMS = ['vault', 'send', 'links']
  const sim = (id: string) => (live.session && !LIVE_ROOMS.includes(id) ? <span className="badge side-sim">sim</span> : null)
  const total = live.session
    ? live.balances.reduce((s, b) => s + b.amount * (prices[b.asset] ?? 0), 0)
    : Object.entries(shielded).reduce((s, [a, v]) => s + v * (prices[a] ?? 0), 0)
  const current = [...ROOMS, { id: 'activity', name: 'Activity' }].find((r) => loc.pathname.startsWith(`/app/${r.id}`))
  const link = (id: string, name: string, extra?: ReactNode) => (
    <NavLink key={id} to={`/app/${id}`} title={collapsed ? name : undefined}>
      <Shape kind={id} size={18} /><span className="lbl">{name}</span>{extra}
    </NavLink>
  )

  return (
    <div className={`shell${collapsed ? ' collapsed' : ''}${drawer ? ' drawer-open' : ''}`}>
      <div className="side-scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className="side" aria-label="Rooms">
        <div className="side-top">
          <span className="tag lbl">Rooms</span>
          <button
            className="side-toggle desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" /><line x1="6" y1="2.5" x2="6" y2="13.5" />
              <path d={collapsed ? 'M9 6.5 L11 8 L9 9.5' : 'M11 6.5 L9 8 L11 9.5'} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button className="side-toggle mobile-only" onClick={() => setDrawer(false)} aria-label="Close rooms">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="tag grp">Core</div>
        {ROOMS.slice(0, 4).map((r) => link(r.id, r.name, sim(r.id)))}
        <div className="tag grp">pullhaus extras</div>
        {ROOMS.slice(4).map((r) => link(r.id, r.name, sim(r.id)))}
        <div className="tag grp">You</div>
        {link('activity', 'Activity')}
        {(live.session || connected) && (
          <div className="side-wallet">
            <div className="tag lbl"><span className={live.session ? 'dot live' : 'dot'} />{live.session ? `Privacy Rings · ${CLUSTER}` : 'Demo wallet'}</div>
            <div className="side-total lbl">{usd(total)}</div>
            <div className="dim mono lbl" style={{ fontSize: 12 }}>{short(live.session ? live.session.owner : address, 6, 6)}</div>
            <span className="side-dot-only" title={live.session ? `Privacy Rings · ${usd(total)}` : `Demo wallet · ${usd(total)}`}>
              <span className={live.session ? 'dot live' : 'dot'} />
            </span>
            <div className="row lbl" style={{ gap: 6, marginTop: 10 }}>
              {live.session ? (
                <button className="btn sm" onClick={live.disconnect}>Disconnect</button>
              ) : (
                <>
                  <button className="btn sm" onClick={disconnect}>Disconnect</button>
                  <button className="btn sm" title="Wipe demo state" onClick={() => confirm('Reset all demo data?') && reset()}>Reset</button>
                </>
              )}
            </div>
          </div>
        )}
      </aside>
      <main className="main">
        <div className="room-bar mobile-only">
          <button className="btn sm" onClick={() => setDrawer(true)} aria-label="Open rooms" aria-expanded={drawer}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" /></svg>
            Rooms
          </button>
          {current && <span className="muted" style={{ fontSize: 14 }}>{current.name}</span>}
        </div>
        <Gate>
          <Routes>
            <Route index element={<Navigate to="vault" replace />} />
            {Object.entries(COMP).map(([id, C]) => <Route key={id} path={id} element={<C />} />)}
            <Route path="activity" element={<Activity />} />
            <Route path="*" element={<Navigate to="vault" replace />} />
          </Routes>
        </Gate>
      </main>
    </div>
  )
}

export function RoomHead({ id, title, lead }: { id: string; title: string; lead: string }) {
  return (
    <>
      <div className="row"><Shape kind={id} size={28} /><span className="tag">Room</span></div>
      <h1>{title}</h1>
      <p className="lead">{lead}</p>
    </>
  )
}

export function Balances() {
  const { pub, shielded, assets } = useStore()
  const live = useLive()
  if (live.session) {
    const rows = ['SOL', 'USDC'].map((a) => live.balances.find((b) => b.asset === a) ?? { asset: a, amount: 0, utxos: 0 })
    return (
      <div className="balances">
        {rows.map((b) => (
          <div className="bal" key={b.asset}>
            <span className="tag">{b.asset} · private</span>
            <b className="yellow">{fmt(b.amount, 4)}</b>
            <span className="dim mono" style={{ fontSize: 12 }}>{b.utxos} notes</span>
          </div>
        ))}
        <button className="bal btn" style={{ height: 'auto' }} disabled={!!live.status} onClick={() => live.refresh()}>{live.status ? `${live.status}…` : 'Refresh'}</button>
      </div>
    )
  }
  const shown = assets.filter((a) => (pub[a] ?? 0) > 0 || (shielded[a] ?? 0) > 0)
  return (
    <div className="balances">
      {shown.map((a) => (
        <div className="bal" key={a}>
          <span className="tag">{a}</span>
          <b className="yellow">{fmt(shielded[a] ?? 0, a === 'BONK' ? 0 : 4)}</b>
          <span className="dim mono" style={{ fontSize: 12 }}>public {fmt(pub[a] ?? 0, a === 'BONK' ? 0 : 2)}</span>
        </div>
      ))}
    </div>
  )
}
