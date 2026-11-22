import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Gate, ROOMS, Shape } from '../components/common'
import { useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { CLUSTER } from '../lib/config'
import { fmt, short, usd } from '../lib/util'
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

export default function AppShell() {
  const { connected, address, disconnect, shielded, prices, reset } = useStore()
  const live = useLive()
  const LIVE_ROOMS = ['vault', 'send', 'links']
  const sim = (id: string) => (live.session && !LIVE_ROOMS.includes(id) ? <span className="badge" style={{ marginLeft: 'auto', fontSize: 10 }}>sim</span> : null)
  const total = live.session
    ? live.balances.reduce((s, b) => s + b.amount * (prices[b.asset] ?? 0), 0)
    : Object.entries(shielded).reduce((s, [a, v]) => s + v * (prices[a] ?? 0), 0)
  return (
    <div className="shell">
      <aside className="side">
        <div className="tag grp">Core</div>
        {ROOMS.slice(0, 4).map((r) => (
          <NavLink key={r.id} to={`/app/${r.id}`}><Shape kind={r.id} size={18} />{r.name}{sim(r.id)}</NavLink>
        ))}
        <div className="tag grp">pullhaus extras</div>
        {ROOMS.slice(4).map((r) => (
          <NavLink key={r.id} to={`/app/${r.id}`}><Shape kind={r.id} size={18} />{r.name}{sim(r.id)}</NavLink>
        ))}
        <div className="tag grp">You</div>
        <NavLink to="/app/activity"><Shape kind="activity" size={18} />Activity</NavLink>
        {live.session ? (
          <div style={{ padding: '18px 12px' }} className="stack side-wallet">
            <div className="tag"><span className="dot live" />Privacy Rings · {CLUSTER}</div>
            <div className="mono" style={{ fontSize: 20 }}>{usd(total)}</div>
            <div className="dim mono" style={{ fontSize: 12 }}>{short(live.session.owner, 6, 6)}</div>
            <button className="btn sm" onClick={live.disconnect}>Disconnect</button>
          </div>
        ) : connected && (
          <div style={{ padding: '18px 12px' }} className="stack side-wallet">
            <div className="tag"><span className="dot" />Demo wallet</div>
            <div className="mono" style={{ fontSize: 20 }}>{usd(total)}</div>
            <div className="dim mono" style={{ fontSize: 12 }}>{short(address, 6, 6)}</div>
            <div className="row">
              <button className="btn sm" onClick={disconnect}>Disconnect</button>
              <button className="btn sm" title="Wipe demo state" onClick={() => confirm('Reset all demo data?') && reset()}>Reset</button>
            </div>
          </div>
        )}
      </aside>
      <main className="main">
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
