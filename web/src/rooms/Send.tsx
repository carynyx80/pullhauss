import { useState } from 'react'
import { AssetSelect, SigLink, useProver } from '../components/common'
import { useLive } from '../lib/live'
import { FEE_BPS, LIVE_SYMBOLS } from '../lib/config'
import { Balances, RoomHead } from '../pages/AppShell'
import { useStore } from '../lib/store'

type Row = { to: string; amount: string }

export default function Send() {
  const st = useStore()
  const [asset, setAsset] = useState('USDC')
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [to, setTo] = useState('')
  const [amt, setAmt] = useState('')
  const [memo, setMemo] = useState('')
  const [rows, setRows] = useState<Row[]>([{ to: '', amount: '' }, { to: '', amount: '' }])
  const p = useProver()
  const live = useLive()
  const on = !!live.session
  const [lastSig, setLastSig] = useState('')
  const have = on ? live.balances.find((b) => b.asset === asset)?.amount ?? 0 : st.shielded[asset] ?? 0
  const batchTotal = rows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const feeOn = !!live.session?.feesActive
  const maxRows = live.session?.maxRecipients ?? 15
  const feeOf = (v: number) => +(v * Number(FEE_BPS) / 10_000).toFixed(6)
  const feeLine = (v: number) => on && (
    <div className="dim mono" style={{ fontSize: 12 }}>
      {feeOn ? `+ ${Number(FEE_BPS) / 100}% pullhaus fee${v > 0 ? ` (${feeOf(v)} ${asset})` : ''}, paid privately in the same transaction. Recipients get the full amount.` : 'No app fee on this transfer.'}
    </div>
  )

  return (
    <>
      <RoomHead id="send" title="Send" lead="Private transfers on Privacy Rings. The recipient gets a note only they can open. The asset and amount are encrypted; on the default ring the two wallet addresses are still visible. Use Stealth to hide who's getting paid." />
      <Balances />
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="seg" style={{ marginBottom: 16 }}>
            <button className={mode === 'single' ? 'on' : ''} onClick={() => setMode('single')}>Single</button>
            <button className={mode === 'batch' ? 'on' : ''} onClick={() => setMode('batch')}>Payroll / batch</button>
          </div>
          <div className="stack">
            <label className="field"><span>ASSET · private {have.toLocaleString()}</span><AssetSelect value={asset} onChange={setAsset} assets={on ? LIVE_SYMBOLS : st.assets} /></label>
            {mode === 'single' ? (
              <>
                <label className="field"><span>RECIPIENT</span>
                  <input className="input mono" placeholder={on ? 'Recipient Solana address (must be registered on Privacy Rings)' : 'ph1… shielded address or st:ph… stealth meta-address'} value={to} onChange={(e) => setTo(e.target.value)} />
                </label>
                <label className="field"><span>AMOUNT</span><input className="input big" inputMode="decimal" placeholder="0.0" value={amt} onChange={(e) => setAmt(e.target.value)} /></label>
                {feeLine(parseFloat(amt) || 0)}
                {!on && <label className="field"><span>ENCRYPTED MEMO (optional, only recipient can read)</span><input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Invoice #42" /></label>}
              </>
            ) : (
              <>
                {rows.map((r, i) => (
                  <div className="row" key={i}>
                    <input className="input mono grow" placeholder={`Recipient ${i + 1}`} value={r.to} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
                    <input className="input mono" style={{ width: 120 }} placeholder="0.0" value={r.amount} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} />
                  </div>
                ))}
                <div className="row between">
                  <button className="btn sm" disabled={on && rows.length >= maxRows} onClick={() => setRows([...rows, { to: '', amount: '' }])}>+ Add recipient{on && ` (max ${maxRows})`}</button>
                  <span className="mono dim">Total {batchTotal.toLocaleString()} {asset}</span>
                </div>
                {feeLine(batchTotal)}
              </>
            )}
            <button className="btn red block" disabled={p.busy || !!live.status} onClick={() => p.run(async () => {
              if (on) {
                if (mode === 'single') {
                  if (!to.trim() || !(parseFloat(amt) > 0)) throw new Error('Add a recipient and an amount.')
                  setLastSig(await live.run('Sending privately', (s) => s.transfer(asset, amt, to.trim())))
                  return `Sent ${amt} ${asset}. The amount is encrypted on-chain.`
                }
                const valid = rows.filter((r) => r.to.trim() && parseFloat(r.amount) > 0)
                if (!valid.length) throw new Error('Add at least one recipient with an amount.')
                setLastSig(await live.run('Paying recipients', (s) => s.multiTransfer(asset, valid.map((r) => ({ to: r.to.trim(), amount: r.amount })))))
                return `Paid ${valid.length} recipients in one private transaction.`
              }
              if (mode === 'single') { st.send(asset, parseFloat(amt), to); return `Sent. On-chain this looks like any other 2-in/2-out transaction.` }
              const valid = rows.filter((r) => r.to.trim() && parseFloat(r.amount) > 0)
              if (!valid.length) throw new Error('Add at least one recipient with an amount.')
              if (batchTotal > (st.shielded[asset] ?? 0)) throw new Error(`Batch needs ${batchTotal} ${asset}, vault has ${st.shielded[asset] ?? 0}.`)
              valid.forEach((r) => st.send(asset, parseFloat(r.amount), r.to))
              return `Paid ${valid.length} recipients in ${valid.length} unlinkable transactions.`
            }, { live: on })}>{mode === 'single' ? 'Prove & send' : 'Prove & pay all'}</button>
          </div>
          {p.view}
          {on && lastSig && <div className="dim" style={{ fontSize: 13, marginTop: 8 }}>Transaction <SigLink sig={lastSig} /></div>}
        </div>
        <div className="card">
          <h3>What an observer sees</h3>
          <div className="prover" style={{ marginTop: 12, lineHeight: 1.8 }}>
            <div><span className="dim">program</span> Solana Privacy Program (ring1Ga…ANW)</div>
            <div><span className="dim">ring</span> default (permissionless, confidential)</div>
            <div><span className="dim">asset</span> <span className="green">encrypted</span> · <span className="dim">amount</span> <span className="green">encrypted</span> · <span className="dim">memo</span> <span className="green">encrypted</span></div>
            <div><span className="dim">sender</span> <span className="yellow">visible</span> · <span className="dim">recipient</span> <span className="yellow">visible</span></div>
            <div><span className="dim">proof</span> verified on Solana, no L2</div>
          </div>
          <p className="dim" style={{ fontSize: 13 }}>This is how the Privacy Rings default ring works, per Helius' docs. To hide the recipient too, pay a fresh one-time address from <b>Stealth</b>. Anonymous rings that hide both sides are a Helius custom-ring feature.</p>
        </div>
      </div>
    </>
  )
}
