import { useState } from 'react'
import { AssetSelect, useProver, SimNote } from '../components/common'
import { Balances, RoomHead } from '../pages/AppShell'
import { useStore } from '../lib/store'
import { ago, short } from '../lib/util'

export default function Orders() {
  const st = useStore()
  const [kind, setKind] = useState<'limit' | 'dca'>('limit')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [base, setBase] = useState('SOL')
  const [quote, setQuote] = useState('USDC')
  const [amt, setAmt] = useState('')
  const [limit, setLimit] = useState('')
  const [slices, setSlices] = useState('6')
  const p = useProver()
  const mkt = (st.prices[base] ?? 0) / (st.prices[quote] ?? 1)
  const inAsset = side === 'buy' ? quote : base

  return (
    <>
      <RoomHead id="orders" title="Orders" lead="Hidden limit orders and DCA. Funds wait in escrow behind a commitment, so nobody can see your price or size until a keeper fills the order." />
      <SimNote />
      <Balances />
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="card stack">
          <div className="row between wrapflex">
            <div className="seg"><button className={kind === 'limit' ? 'on' : ''} onClick={() => setKind('limit')}>Limit</button><button className={kind === 'dca' ? 'on' : ''} onClick={() => setKind('dca')}>DCA</button></div>
            <div className="seg"><button className={side === 'buy' ? 'on' : ''} onClick={() => setSide('buy')}>Buy</button><button className={side === 'sell' ? 'on' : ''} onClick={() => setSide('sell')}>Sell</button></div>
          </div>
          <div className="row">
            <label className="field grow"><span>BASE</span><AssetSelect value={base} onChange={setBase} assets={st.assets} /></label>
            <label className="field grow"><span>QUOTE</span><AssetSelect value={quote} onChange={setQuote} assets={st.assets} /></label>
          </div>
          <label className="field"><span>SPEND ({inAsset}) · shielded {(st.shielded[inAsset] ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}</span><input className="input big" value={amt} onChange={(e) => setAmt(e.target.value)} placeholder="0.0" /></label>
          {kind === 'limit' ? (
            <label className="field"><span>LIMIT PRICE ({quote} per {base}) · market {mkt.toPrecision(6)}</span>
              <div className="row"><input className="input mono grow" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={mkt.toPrecision(6)} />
                <button className="btn sm" onClick={() => setLimit((mkt * (side === 'buy' ? 0.998 : 1.002)).toPrecision(6))}>Near market</button></div>
            </label>
          ) : (
            <label className="field"><span>NUMBER OF SLICES</span><input className="input mono" value={slices} onChange={(e) => setSlices(e.target.value.replace(/\D/g, ''))} /></label>
          )}
          <button className="btn blue block" disabled={p.busy} onClick={() => p.run(() => {
            st.placeOrder({ kind, side, base, quote, amount: parseFloat(amt), limit: parseFloat(limit) || 0, slices: Math.max(1, parseInt(slices || '1')) })
            setAmt('')
            return 'Order sealed. Escrow funded from your vault.'
          })}>Prove & place hidden order</button>
          {p.view}
        </div>
        <div className="card">
          <h3>Order book (yours only)</h3>
          <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>Everyone else just sees an escrow commitment like <span className="mono">0x5ea1…</span>.</p>
          {st.orders.length === 0 ? <div className="empty">No orders yet.</div> : st.orders.map((o) => {
            const inA = o.side === 'buy' ? o.quote : o.base
            return (
              <div className="list-item" key={o.id} style={{ flexWrap: 'wrap' }}>
                <span className={`badge ${o.side === 'buy' ? 'g' : 'r'}`}>{o.kind} {o.side}</span>
                <span className="mono grow" style={{ fontSize: 13 }}>
                  {o.amount} {inA} {o.kind === 'limit' ? `@ ${o.limit.toPrecision(5)}` : `in ${o.slices} slices`} · {o.base}/{o.quote}
                  <div className="dim" style={{ fontSize: 11 }}>{short(o.commitment, 8, 4)} · {ago(o.created)} · filled {((o.filled / o.amount) * 100).toFixed(0)}%</div>
                </span>
                {o.status === 'open' ? <button className="btn sm" onClick={() => st.cancelOrder(o.id)}>Cancel</button> : <span className={`badge ${o.status === 'filled' ? 'g' : ''}`}>{o.status}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
