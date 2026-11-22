import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'
import { AssetSelect, Copy } from '../components/common'
import { RoomHead } from '../pages/AppShell'
import { PayLink, useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { LIVE_SYMBOLS } from '../lib/config'

/** Live links carry everything in the URL, so they work in any browser. */
export function linkUrl(l: PayLink) {
  if (!l.owner) return `${location.origin}/pay/${l.id}`
  const q = new URLSearchParams({ a: l.asset })
  if (l.amount !== null) q.set('amt', String(l.amount))
  if (l.memo) q.set('m', l.memo)
  return `${location.origin}/pay/${l.owner}?${q}`
}
import { ago } from '../lib/util'

export function Qr({ text }: { text: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => { QRCode.toDataURL(text, { margin: 0, width: 360 }).then(setSrc).catch(() => setSrc('')) }, [text])
  return <div className="qr">{src && <img src={src} alt="Payment link QR code" />}</div>
}

export default function Links() {
  const st = useStore()
  const [asset, setAsset] = useState('USDC')
  const [amt, setAmt] = useState('')
  const [memo, setMemo] = useState('')
  const [open, setOpen] = useState(false)
  const [recurring, setRecurring] = useState(false)
  const [sel, setSel] = useState<PayLink | null>(null)
  const live = useLive()
  const on = !!live.session
  const url = linkUrl
  const links = st.links.filter((l) => (on ? l.owner === live.session!.owner : !l.owner))
  const current = sel ? st.links.find((l) => l.id === sel.id) ?? sel : null

  return (
    <>
      <RoomHead id="links" title="Links" lead="Get paid privately. Invoices, tip jars and subscriptions as a link or QR code. Payers deposit straight into your Privacy Rings balance, and your balance stays encrypted." />
      <div className="grid2">
        <div className="card stack">
          <h3>New payment link</h3>
          <label className="field"><span>ASSET</span><AssetSelect value={asset} onChange={setAsset} assets={on ? LIVE_SYMBOLS : st.assets} /></label>
          <div className="row">
            <label className="field grow"><span>AMOUNT</span><input className="input mono" disabled={open} value={open ? '' : amt} placeholder={open ? 'Payer chooses' : '0.0'} onChange={(e) => setAmt(e.target.value)} /></label>
            <label className="row" style={{ marginTop: 20, fontSize: 13 }}><input type="checkbox" checked={open} onChange={(e) => setOpen(e.target.checked)} />Any amount (tip jar)</label>
          </div>
          <label className="field"><span>MEMO (shown to payer)</span><input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Design work, March" /></label>
          {!on && <label className="row" style={{ fontSize: 13 }}><input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />Reusable (stays open after each payment)</label>}
          {on && <p className="dim" style={{ fontSize: 12, margin: 0 }}>Payments are Privacy Rings deposits to your address: the payer, amount and you are visible on that one transaction, and the funds land in your encrypted balance.</p>}
          <button className="btn yellow block" onClick={() => {
            const v = open ? null : parseFloat(amt)
            if (v !== null && !(v > 0)) return alert('Enter an amount or tick "Any amount".')
            setSel(st.createLink(asset, v, memo, on || recurring, on ? live.session!.owner : undefined)); setAmt(''); setMemo('')
          }}>Create link</button>
        </div>
        <div className="card">
          {current ? (
            <div className="stack">
              <div className="row between"><h3>{current.memo || 'Payment link'}</h3><span className={`badge ${current.active ? 'g' : ''}`}>{current.active ? 'open' : 'closed'}</span></div>
              <div className="row wrapflex" style={{ alignItems: 'flex-start', gap: 20 }}>
                <Qr text={url(current)} />
                <div className="stack grow">
                  <div className="mono" style={{ fontSize: 24 }}>{current.amount ?? 'Any'} {current.asset}</div>
                  <div className="mono dim break" style={{ fontSize: 12 }}>{url(current)}</div>
                  <div className="row wrapflex"><Copy text={url(current)} label="Copy link" /><Link className="btn sm" to={url(current).replace(location.origin, '')}>Open as payer</Link>{!current.owner && <button className="btn sm" onClick={() => st.toggleLink(current.id)}>{current.active ? 'Close' : 'Reopen'}</button>}</div>
                  {current.owner ? <div className="dim" style={{ fontSize: 13 }}>Payments appear in your Vault balance after a refresh.</div> : <div className="dim" style={{ fontSize: 13 }}>{current.receipts.length} payments · {current.receipts.reduce((s, r) => s + r.amount, 0).toLocaleString()} {current.asset} received</div>}
                </div>
              </div>
            </div>
          ) : <div className="empty">Create or select a link to see its QR code.</div>}
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Your links</h3>
        {links.length === 0 ? <div className="empty" style={{ marginTop: 10 }}>No links yet.</div> : (
          <div className="tablewrap"><table className="t"><thead><tr><th>Link</th><th>Memo</th><th>Amount</th><th>Paid</th><th>Status</th><th>Created</th></tr></thead><tbody>
            {links.map((l) => (
              <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSel(l)}>
                <td>/pay/{(l.owner ?? l.id).slice(0, 10)}…</td><td style={{ fontFamily: 'var(--sans)' }}>{l.memo || '–'}</td><td>{l.amount ?? 'any'} {l.asset}</td><td>{l.receipts.length}×</td>
                <td><span className={`badge ${l.active ? 'g' : ''}`}>{l.active ? 'open' : 'closed'}</span>{l.recurring && <span className="badge" style={{ marginLeft: 4 }}>reusable</span>}</td><td className="dim">{ago(l.created)}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </div>
    </>
  )
}
