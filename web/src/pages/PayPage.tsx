import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { SigLink, useProver, WalletPicker } from '../components/common'
import { useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { FEE_BPS, LIVE_SYMBOLS } from '../lib/config'
import { short } from '../lib/util'
import { Qr } from '../rooms/Links'

const isSolanaAddress = (s: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)

export default function PayPage() {
  const { id = '' } = useParams()
  const [q] = useSearchParams()
  return isSolanaAddress(id) ? <LivePay owner={id} asset={q.get('a') ?? 'USDC'} fixed={q.get('amt')} memo={q.get('m') ?? ''} /> : <DemoPay id={id} />
}

/** A live Privacy Rings payment link: the payer deposits into the owner's private balance. */
function LivePay({ owner, asset, fixed, memo }: { owner: string; asset: string; fixed: string | null; memo: string }) {
  const live = useLive()
  const [amt, setAmt] = useState('')
  const [sig, setSig] = useState('')
  const p = useProver()
  const supported = LIVE_SYMBOLS.includes(asset)
  const amount = fixed ?? amt

  return (
    <Shell>
      <span className="tag">Private payment request · Privacy Rings</span>
      <h1 style={{ margin: 0, letterSpacing: '-0.03em' }}>{memo || 'Payment'}</h1>
      <div className="mono" style={{ fontSize: 30 }}>{fixed ?? 'Any amount'} <span className="yellow">{asset}</span></div>
      <div className="dim mono" style={{ fontSize: 12 }}>to {short(owner, 6, 6)}</div>
      <div style={{ alignSelf: 'center' }}><Qr text={location.href} /></div>
      {!supported ? <div className="err">{asset} isn't supported on pullhaus live yet.</div> : !live.session ? (
        <><div className="dim" style={{ fontSize: 13 }}>Connect a wallet to pay.</div><WalletPicker /></>
      ) : sig ? (
        <div className="ok">Paid. Transaction <SigLink sig={sig} /></div>
      ) : (
        <>
          {!fixed && <input className="input big" placeholder="0.0" value={amt} onChange={(e) => setAmt(e.target.value)} />}
          <button className="btn yellow block" disabled={p.busy || !!live.status} onClick={() => p.run(async () => {
            if (!(parseFloat(amount) > 0)) throw new Error('Enter an amount above zero.')
            setSig(await live.run('Paying', (s) => s.deposit(asset, amount, owner, true)))
            return 'Paid into their private balance.'
          }, { live: true })}>Pay {amount || ''} {asset}</button>
          <div className="dim mono" style={{ fontSize: 12 }}>+ {Number(FEE_BPS) / 100}% pullhaus fee{parseFloat(amount) > 0 && ` (${+(parseFloat(amount) * Number(FEE_BPS) / 10_000).toFixed(6)} ${asset})`}. The recipient gets the full amount.</div>
        </>
      )}
      {p.view}
      <p className="dim" style={{ fontSize: 12, margin: 0 }}>This is a Privacy Rings deposit. Your address, the amount and the recipient show on this one transaction; after that the funds sit in the recipient's encrypted balance.</p>
    </Shell>
  )
}

function DemoPay({ id }: { id: string }) {
  const st = useStore()
  const link = st.links.find((l) => l.id === id)
  const [amt, setAmt] = useState('')
  const p = useProver()

  if (!link) return (
    <div className="wrap" style={{ padding: '80px 16px', textAlign: 'center' }}>
      <h2>Link not found</h2>
      <p className="muted">Demo links only open in the browser that created them. Live links work anywhere.</p>
      <Link to="/app/links" className="btn">Go to Links</Link>
    </div>
  )

  return (
    <Shell>
      <span className="tag">Private payment request · demo</span>
      <h1 style={{ margin: 0, letterSpacing: '-0.03em' }}>{link.memo || 'Payment'}</h1>
      <div className="mono" style={{ fontSize: 30 }}>{link.amount ?? 'Any amount'} <span className="yellow">{link.asset}</span></div>
      <div style={{ alignSelf: 'center' }}><Qr text={location.href} /></div>
      {!link.active ? <div className="err">This link is closed.</div> : (
        <>
          {link.amount === null && <input className="input big" placeholder="0.0" value={amt} onChange={(e) => setAmt(e.target.value)} />}
          <button className="btn yellow block" disabled={p.busy} onClick={() => p.run(() => {
            st.payLink(link.id, link.amount ?? parseFloat(amt))
            return 'Paid (simulated).'
          })}>Pay privately</button>
        </>
      )}
      {p.view}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="wrap" style={{ maxWidth: 520, padding: '60px 16px' }}>
      <div className="card stack" style={{ padding: 28 }}>{children}</div>
    </div>
  )
}
