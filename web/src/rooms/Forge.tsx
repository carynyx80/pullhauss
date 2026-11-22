import { useState } from 'react'
import { useProver, SimNote } from '../components/common'
import { RoomHead } from '../pages/AppShell'
import { launchPrice, useStore } from '../lib/store'
import { ago, short } from '../lib/util'

export default function Forge() {
  const st = useStore()
  const [name, setName] = useState('')
  const [sym, setSym] = useState('')
  const [supply, setSupply] = useState('1000000000')
  const [dev, setDev] = useState('0.5')
  const [buy, setBuy] = useState<Record<string, string>>({})
  const p = useProver()
  const bp = useProver()

  return (
    <>
      <RoomHead id="forge" title="Forge" lead="Launch a coin where every buyer is anonymous. Buys are paid from shielded SOL, so there are no wallets to snipe, copy-trade or track." />
      <SimNote />
      <div className="grid2">
        <div className="card stack">
          <h3>Forge a coin</h3>
          <label className="field"><span>NAME</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Night Shift" /></label>
          <div className="row">
            <label className="field grow"><span>TICKER</span><input className="input mono" value={sym} onChange={(e) => setSym(e.target.value.toUpperCase())} placeholder="SHIFT" maxLength={8} /></label>
            <label className="field grow"><span>SUPPLY</span><input className="input mono" value={supply} onChange={(e) => setSupply(e.target.value.replace(/\D/g, ''))} /></label>
          </div>
          <label className="field"><span>PRIVATE DEV BUY (SOL from vault · shielded {(st.shielded.SOL ?? 0).toFixed(3)})</span><input className="input mono" value={dev} onChange={(e) => setDev(e.target.value)} /></label>
          <div className="dim mono" style={{ fontSize: 12 }}>Linear curve · 40× from first to last token · dev buy capped at 20% of supply · LP locked once the curve sells out</div>
          <button className="btn red block" disabled={p.busy} onClick={() => p.run(() => {
            const l = st.createLaunch(name, sym, parseInt(supply || '0'), parseFloat(dev) || 0)
            setName(''); setSym('')
            return `$${l.symbol} forged. Mint ${short(l.mint, 6, 6)}.`
          }, { proving: (parseFloat(dev) || 0) > 0 })}>Forge it</button>
          {p.view}
        </div>
        <div className="card">
          <h3>On the curve</h3>
          {st.launches.length === 0 ? <div className="empty" style={{ marginTop: 12 }}>No launches yet. Forge the first one.</div> : st.launches.map((l) => {
            const pct = (l.sold / l.supply) * 100
            return (
              <div key={l.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--line)' }}>
                <div className="row between">
                  <div><b>{l.name}</b> <span className="badge y">${l.symbol}</span> {l.mine && <span className="badge">yours</span>}</div>
                  <span className="dim" style={{ fontSize: 12 }}>{ago(l.created)}</span>
                </div>
                <div className="row between mono dim" style={{ fontSize: 12, marginTop: 6 }}>
                  <span>{(launchPrice(l) * 1e9).toFixed(2)} SOL / 1B</span>
                  <span>raised {l.raised.toFixed(3)} SOL</span>
                  <span>{pct.toFixed(2)}% sold</span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: 'var(--text)' }} /></div>
                <div className="row" style={{ marginTop: 10 }}>
                  <input className="input mono" style={{ height: 32 }} placeholder="SOL" value={buy[l.id] ?? ''} onChange={(e) => setBuy({ ...buy, [l.id]: e.target.value })} />
                  <button className="btn sm" disabled={bp.busy} onClick={() => bp.run(() => {
                    const t = st.buyLaunch(l.id, parseFloat(buy[l.id] || '0'))
                    return `Bought ${t.toLocaleString(undefined, { maximumFractionDigits: 0 })} $${l.symbol} anonymously.`
                  })}>Buy privately</button>
                </div>
              </div>
            )
          })}
          {bp.view}
        </div>
      </div>
    </>
  )
}
