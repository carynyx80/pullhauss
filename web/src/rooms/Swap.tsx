import { useState } from 'react'
import { AssetSelect, useProver, SimNote } from '../components/common'
import { Balances, RoomHead } from '../pages/AppShell'
import { SWAP_FEE, useStore } from '../lib/store'

export default function Swap() {
  const st = useStore()
  const [from, setFrom] = useState('USDC')
  const [to, setTo] = useState('SOL')
  const [amt, setAmt] = useState('')
  const p = useProver()
  const v = parseFloat(amt) || 0
  const rate = (st.prices[from] ?? 0) / (st.prices[to] ?? 1)
  const out = v * rate * (1 - SWAP_FEE)

  return (
    <>
      <RoomHead id="swap" title="Swap" lead="Trade without showing your hand. Shielded inputs go through Solana liquidity in one relayed bundle and come back as fresh notes." />
      <SimNote />
      <Balances />
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="card stack">
          <label className="field"><span>FROM · shielded {(st.shielded[from] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
            <div className="row"><input className="input big grow" placeholder="0.0" value={amt} onChange={(e) => setAmt(e.target.value)} /><div style={{ width: 120 }}><AssetSelect value={from} onChange={setFrom} assets={st.assets} /></div></div>
          </label>
          <div style={{ textAlign: 'center' }}><button className="btn sm" onClick={() => { setFrom(to); setTo(from) }}>⇅</button></div>
          <label className="field"><span>TO (estimated)</span>
            <div className="row"><input className="input big grow" readOnly value={out ? out.toPrecision(6) : ''} placeholder="0.0" /><div style={{ width: 120 }}><AssetSelect value={to} onChange={setTo} assets={st.assets} /></div></div>
          </label>
          <div className="dim mono" style={{ fontSize: 12 }}>1 {from} = {rate.toPrecision(6)} {to} · fee {SWAP_FEE * 100}% · route: pool → Jupiter → pool</div>
          <button className="btn blue block" disabled={p.busy} onClick={() => p.run(() => {
            const got = st.swap(from, to, v)
            return `Received ${got.toPrecision(6)} ${to} as a new shielded note.`
          })}>Prove & swap</button>
          {p.view}
        </div>
        <div className="card">
          <h3>Live prices</h3>
          {st.assets.map((a) => (
            <div className="list-item" key={a}>
              <span className="badge">{a}</span>
              <span className="grow" />
              <span className="mono">${(st.prices[a] ?? 0) < 0.01 ? (st.prices[a] ?? 0).toExponential(3) : (st.prices[a] ?? 0).toFixed(4)}</span>
            </div>
          ))}
          <p className="dim" style={{ fontSize: 13 }}>Want a specific price? Use <b>Orders</b> to place a hidden limit order instead.</p>
        </div>
      </div>
    </>
  )
}
