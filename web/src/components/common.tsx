import { ReactNode, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { Wallet as StdWallet } from '@wallet-standard/base'
import { useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { CLUSTER, LIVE_AVAILABLE, TREASURY, explorerAddr, explorerTx } from '../lib/config'
import { short, sleep } from '../lib/util'

export function Logo() {
  return (
    <Link to="/" className="logo">
      <span className="logo-mark"><i className="c" /><i className="s" /><i className="t" /></span>
      pullhaus
    </Link>
  )
}

export function Nav() {
  const { connected, address } = useStore()
  const live = useLive()
  const who = live.session ? live.session.owner : connected ? address : ''
  return (
    <header className="nav">
      <div className="wrap">
        <Logo />
        <nav className="nav-links">
          <NavLink to="/app">App</NavLink>
          <NavLink to="/explorer">Explorer</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/docs#program">Developers</NavLink>
        </nav>
        <div className="spacer" />
        {who && (
          <Link to="/app" className="btn sm mono" title={live.session ? `Privacy Rings · ${CLUSTER}` : 'Demo wallet'}>
            <span className={live.session ? 'dot live' : 'dot'} />{short(who, 4, 4)}
          </Link>
        )}
        <Link to="/app" className="btn sm primary">Enter the haus</Link>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <span>
          pullhaus · powered by Helius Solana Privacy Rings · company treasury{' '}
          <a href={explorerAddr(TREASURY)} target="_blank" rel="noreferrer" className="mono" style={{ marginLeft: 0 }}>{short(TREASURY, 4, 4)}</a>
        </span>
        <span>
          <Link to="/explorer">Explorer</Link>
          <Link to="/docs">Docs</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer">GitHub</a>
        </span>
      </div>
    </footer>
  )
}

/** Geometric glyph for each room. */
export function Shape({ kind, size = 34 }: { kind: string; size?: number }) {
  const s = size
  const R = 'var(--red)', Y = 'var(--yellow)', B = 'var(--blue)', I = 'var(--ink)'
  const shapes: Record<string, ReactNode> = {
    vault: <><rect x="2" y="2" width="30" height="30" fill={Y} /><circle cx="17" cy="17" r="8" fill="var(--bg)" /></>,
    send: <><circle cx="12" cy="17" r="10" fill={R} /><polygon points="18,6 32,17 18,28" fill={I} /></>,
    swap: <><circle cx="12" cy="12" r="10" fill={B} /><rect x="14" y="14" width="18" height="18" fill={Y} /></>,
    forge: <><polygon points="17,2 32,32 2,32" fill={R} /><rect x="12" y="20" width="10" height="12" fill={I} /></>,
    links: <><circle cx="11" cy="17" r="8" fill="none" stroke={Y} strokeWidth="5" /><circle cx="23" cy="17" r="8" fill="none" stroke={I} strokeWidth="5" /></>,
    orders: <><rect x="2" y="20" width="8" height="12" fill={I} /><rect x="13" y="11" width="8" height="21" fill={B} /><rect x="24" y="2" width="8" height="30" fill={R} /></>,
    stealth: <><circle cx="17" cy="17" r="15" fill={I} /><circle cx="22" cy="14" r="12" fill="var(--bg-2)" /></>,
    proofs: <><rect x="2" y="2" width="30" height="30" fill="none" stroke={B} strokeWidth="4" /><polyline points="9,17 15,23 26,10" fill="none" stroke={Y} strokeWidth="4" /></>,
    activity: <><rect x="2" y="8" width="30" height="4" fill={I} /><rect x="2" y="16" width="20" height="4" fill={R} /><rect x="2" y="24" width="26" height="4" fill={I} /></>,
  }
  return <svg width={s} height={s} viewBox="0 0 34 34" aria-hidden>{shapes[kind]}</svg>
}

export const ROOMS = [
  { id: 'vault', name: 'Vault', blurb: 'Deposit into Privacy Rings. Your balance becomes encrypted notes only you can read.' },
  { id: 'send', name: 'Send', blurb: 'Pay anyone with the asset and amount encrypted. Payroll pays up to 15 people in one transaction.' },
  { id: 'swap', name: 'Swap', blurb: 'Trade inside the pool. Swaps route through Solana liquidity without revealing who traded.' },
  { id: 'forge', name: 'Forge', blurb: 'Launch a coin on a fair bonding curve where buyers stay anonymous. No sniping wallets to copy.' },
  { id: 'links', name: 'Links', blurb: 'Private invoices, tip jars and payroll. Share a link or QR and get paid into your vault.', isNew: true },
  { id: 'orders', name: 'Orders', blurb: 'Hidden limit orders and DCA. Your price and size stay sealed until the keeper fills them.', isNew: true },
  { id: 'stealth', name: 'Stealth', blurb: 'Publish one meta-address. Every payer gets a fresh one-time address nobody can link back.', isNew: true },
  { id: 'proofs', name: 'Proofs', blurb: 'Prove your funds are clean without revealing which deposits are yours. Share view keys when you choose.', isNew: true },
] as const

export function AssetSelect({ value, onChange, assets }: { value: string; onChange: (v: string) => void; assets: string[] }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {assets.map((a) => <option key={a} value={a}>{a}</option>)}
    </select>
  )
}

const STAGES = ['Building transaction', 'Proving on Helius prover', 'Wallet signs & submits', 'Confirmed on Solana']

/**
 * Progress UI for a private action. Demo mode simulates the stages; live mode
 * runs the real Privacy Rings call (proof from Helius' prover, wallet signs).
 */
export function useProver() {
  const [stage, setStage] = useState(-1)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const busy = stage >= 0 && stage < STAGES.length

  async function run(action: () => string | void | Promise<string | void>, opts: { proving?: boolean; live?: boolean } = {}) {
    setError(''); setDone('')
    const proving = opts.proving ?? true
    try {
      if (opts.live) {
        // real proving happens inside the Rings call; show one active stage meanwhile
        setStage(1)
      } else if (proving) {
        for (let i = 0; i < STAGES.length - 1; i++) { setStage(i); await sleep([450, 1100, 650][i]) }
      }
      const msg = await action()
      setStage(STAGES.length)
      setDone(msg || 'Done.')
    } catch (e) {
      setStage(-1)
      setError((e as Error).message)
    }
  }

  const view = (stage >= 0 || error || done) ? (
    <div className="stack" style={{ marginTop: 14 }}>
      {stage >= 0 && (
        <div className="prover">
          {STAGES.map((s, i) => (
            <div key={s} className={`st ${i < stage ? 'done' : i === stage ? 'on' : ''}`}>
              <span>{i < stage || stage === STAGES.length ? '■' : i === stage ? '▶' : '□'}</span>{s}
            </div>
          ))}
          <div className="bar-track"><div className="bar-fill" style={{ width: `${Math.min(100, (stage / STAGES.length) * 100)}%` }} /></div>
        </div>
      )}
      {error && <div className="err">{error}</div>}
      {done && <div className="ok">{done}</div>}
    </div>
  ) : null

  return { run, busy, view, reset: () => { setStage(-1); setError(''); setDone('') } }
}

export function WalletPicker({ onDone }: { onDone?: () => void }) {
  const live = useLive()
  const [wallets, setWallets] = useState<StdWallet[] | null>(null)
  useEffect(() => { live.wallets().then(setWallets).catch(() => setWallets([])) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!LIVE_AVAILABLE) return <div className="err">Live mode needs a Helius API key. Add VITE_HELIUS_API_KEY to web/.env.local and restart.</div>
  if (wallets === null) return <div className="dim">Looking for wallets…</div>
  if (!wallets.length) return <div className="dim">No Solana wallet found. Install Phantom, Solflare or Backpack, then reload.</div>
  return (
    <div className="stack">
      {wallets.map((w) => (
        <button key={w.name} className="btn block" disabled={!!live.status} onClick={() => live.connect(w).then(onDone).catch(() => {})}>
          <img src={w.icon} alt="" width={18} height={18} />{w.name}
        </button>
      ))}
      {live.status && <div className="ok">{live.status}…</div>}
      {live.error && <div className="err">{live.error}</div>}
    </div>
  )
}

export function Gate({ children }: { children: ReactNode }) {
  const { connected, connect } = useStore()
  const live = useLive()
  if (connected || live.session) return <>{children}</>
  return (
    <div className="gate">
      <Shape kind="vault" size={56} />
      <h2 style={{ letterSpacing: '-0.03em' }}>Enter the haus</h2>
      <div className="grid2" style={{ maxWidth: 720, margin: '24px auto 0', textAlign: 'left' }}>
        <div className="card stack">
          <span className="tag"><span className="dot live" />Live · Privacy Rings {CLUSTER}</span>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Connect your Solana wallet. You sign once to unlock your private balance, and Helius Privacy Rings handles the proofs.</p>
          {CLUSTER === 'mainnet' && <p className="err" style={{ margin: 0 }}>Mainnet: real funds. Privacy Rings are in beta and pullhaus is unaudited, so start small.</p>}
          <WalletPicker />
        </div>
        <div className="card stack">
          <span className="tag"><span className="dot" />Demo</span>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Try every room with a simulated wallet and test funds. Nothing touches a chain.</p>
          <button className="btn yellow block" onClick={connect}>Use demo wallet</button>
        </div>
      </div>
    </div>
  )
}

/** Shown in live mode on rooms that still run on simulated data. */
export function SimNote() {
  const live = useLive()
  if (!live.session) return null
  return <p className="demo-note" style={{ marginBottom: 16 }}>Simulated: this room isn't on Privacy Rings yet. Your live balance isn't touched.</p>
}

export function SigLink({ sig }: { sig: string }) {
  return <a className="mono" href={explorerTx(sig)} target="_blank" rel="noreferrer">{short(sig, 6, 6)} ↗</a>
}

export function Copy({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button className="btn sm" onClick={() => { navigator.clipboard?.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1200) }}>
      {ok ? 'Copied' : label}
    </button>
  )
}
