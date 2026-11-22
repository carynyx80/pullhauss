import React, { ReactNode, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import type { Wallet as StdWallet } from '@wallet-standard/base'
import { useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { CLUSTER, HAUS_LIVE, LIVE_AVAILABLE, TREASURY, explorerAddr, explorerTx } from '../lib/config'
import { short, sleep } from '../lib/util'
import { Mark, Wordmark } from './Mark'

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="pullhaus home">
      <Wordmark size={24} />
    </Link>
  )
}

const NAV = [
  ['/about', 'About'],
  ['/how-it-works', 'How it works'],
  ['/app', 'App'],
  ['/explorer', 'Explorer'],
  ['/docs', 'Docs'],
] as const

const GITHUB_PATH = 'M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z'

/** Sticky header (logo, centred nav, actions) with the ink ticker tape under it. */
export function Nav() {
  const live = useLive()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  const who = live.session?.owner ?? ''
  return (
    <div className="site-top">
      <header className="site-head">
        <div className="wrap">
          <Logo />
          <nav className="nav-links" aria-label="Main">
            {NAV.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
          </nav>
          <div className="head-actions">
            <a className="icon-link hide-sm" href="https://github.com/carynyx80/pullhauss" target="_blank" rel="noreferrer" aria-label="pullhaus on GitHub">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={GITHUB_PATH} /></svg>
            </a>
            {who ? (
              <Link to="/app" className="btn sm ink mono" title={`Privacy Rings · ${CLUSTER}`}>
                <span className="dot live" />{short(who, 4, 4)}
              </Link>
            ) : (
              <Link to="/app" className="btn sm primary">Enter the haus</Link>
            )}
            <button className="burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}><span /></button>
          </div>
        </div>
        <nav className={`mobile-nav${open ? ' open' : ''}`} aria-label="Mobile">
          {NAV.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}
        </nav>
      </header>
      <Ticker />
    </div>
  )
}

type Tick = { sym: string; label: string; fig: string; dir?: 'up' | 'dn' }

/** Ink ticker strip: real market prices (Jupiter), infinite marquee, pauses on hover. */
export function Ticker() {
  const { quotes } = useStore()
  const px = (n: number) => (n < 0.01 ? `$${n.toPrecision(3)}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
  const market = (sym: string, label: string): Tick => {
    const q = quotes[sym]
    if (!q) return { sym, label, fig: '-' }
    const ch = q.change24h
    const chTxt = ch === null ? '' : ` ${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`
    return { sym, label, fig: px(q.usd) + chTxt, dir: ch === null ? undefined : ch >= 0 ? 'up' : 'dn' }
  }
  const items: Tick[] = [
    market('SOL', 'Solana'),
    market('USDC', 'USD Coin'),
    market('JUP', 'Jupiter'),
    market('BONK', 'Bonk'),
    { sym: 'HAUS', label: 'Official token', fig: HAUS_LIVE ? 'live on pump.fun' : 'coming soon' },
    { sym: 'RING', label: 'Privacy Rings', fig: 'beta · mainnet' },
    { sym: 'FEE', label: 'pullhaus fee', fig: '0.25%' },
    { sym: 'TXS', label: 'Recipients per transfer', fig: '15' },
  ]
  const row = items.map((t, i) => (
    <span className="tick" key={i}><b>{t.sym}</b>{t.label}<span className={t.dir ?? ''}>{t.fig}</span></span>
  ))
  return (
    <div className="ticker-tape" aria-label="Market ticker">
      <div className="ticker-track">{row}{row}{row}{row}</div>
    </div>
  )
}

type RevealProps = { children: ReactNode; delay?: number; className?: string }

/** Fade-and-rise when scrolled into view. Stagger with `delay` (ms). */
export function Reveal({ children, delay = 0, className = '' }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) { setShown(true); io.disconnect() }
    }, { rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const style = { '--d': `${delay}ms` } as React.CSSProperties
  return <div ref={ref} className={`reveal${shown ? ' in' : ''} ${className}`.trim()} style={style}>{children}</div>
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="foot-cols">
          <div>
            <Wordmark size={22} />
            <p className="hint" style={{ maxWidth: 300, marginTop: 14 }}>Private money on Solana, powered by Helius Solana Privacy Rings.</p>
          </div>
          <div>
            <h5>Product</h5>
            <Link to="/app">App</Link><Link to="/how-it-works">How it works</Link><Link to="/explorer">Explorer</Link><Link to="/about">About</Link><Link to="/docs">Docs</Link>
          </div>
          <div>
            <h5>Built on</h5>
            <a href="https://www.helius.dev/docs/privacy" target="_blank" rel="noreferrer">Helius Privacy Rings</a>
            <a href="https://solana.com" target="_blank" rel="noreferrer">Solana</a>
            <a href="https://github.com/carynyx80/pullhauss" target="_blank" rel="noreferrer">GitHub</a>
          </div>
          <div>
            <h5>Company</h5>
            <a href={explorerAddr(TREASURY)} target="_blank" rel="noreferrer" className="mono">Treasury {short(TREASURY, 4, 4)}</a>
            <Link to="/docs#fees">Fees</Link>
            <Link to="/docs#security">Security</Link>
          </div>
        </div>
        <div className="foot-word" aria-hidden="true">pullhaus</div>
        <div className="foot-legal">
          <span>Unaudited beta. Not financial advice. Privacy Rings are operated by Helius.</span>
          <span>© 2026 pullhaus</span>
        </div>
      </div>
    </footer>
  )
}

/** Geometric glyph for each room. */
export function Shape({ kind, size = 34 }: { kind: string; size?: number }) {
  const s = size
  // Ink tones only: room glyphs stay quiet; red is reserved for what's clickable.
  const R = 'var(--text)', Y = 'var(--muted)', B = 'var(--line-3)', I = 'var(--text)'
  const shapes: Record<string, ReactNode> = {
    vault: <><rect x="2" y="2" width="30" height="30" fill={Y} /><circle cx="17" cy="17" r="8" fill="var(--surface-3)" /></>,
    send: <><circle cx="12" cy="17" r="10" fill={R} /><polygon points="18,6 32,17 18,28" fill={I} /></>,
    swap: <><circle cx="12" cy="12" r="10" fill={B} /><rect x="14" y="14" width="18" height="18" fill={Y} /></>,
    forge: <><polygon points="17,2 32,32 2,32" fill={R} /><rect x="12" y="20" width="10" height="12" fill={I} /></>,
    links: <><circle cx="11" cy="17" r="8" fill="none" stroke={Y} strokeWidth="5" /><circle cx="23" cy="17" r="8" fill="none" stroke={I} strokeWidth="5" /></>,
    orders: <><rect x="2" y="20" width="8" height="12" fill={I} /><rect x="13" y="11" width="8" height="21" fill={B} /><rect x="24" y="2" width="8" height="30" fill={R} /></>,
    stealth: <><circle cx="17" cy="17" r="15" fill={I} /><circle cx="22" cy="14" r="12" fill="var(--surface-3)" /></>,
    proofs: <><rect x="2" y="2" width="30" height="30" fill="none" stroke={B} strokeWidth="4" /><polyline points="9,17 15,23 26,10" fill="none" stroke={Y} strokeWidth="4" /></>,
    activity: <><rect x="2" y="8" width="30" height="4" fill={I} /><rect x="2" y="16" width="20" height="4" fill={R} /><rect x="2" y="24" width="26" height="4" fill={I} /></>,
  }
  return <svg width={s} height={s} viewBox="0 0 34 34" aria-hidden>{shapes[kind]}</svg>
}

export const ROOMS = [
  { id: 'vault', name: 'Vault', blurb: 'Deposit into Privacy Rings. Your balance becomes encrypted notes only you can read.' },
  { id: 'send', name: 'Send', blurb: 'Pay anyone with the asset and amount encrypted. Payroll pays up to 15 people in one transaction.' },
  { id: 'swap', name: 'Swap', blurb: 'Swap SOL and USDC from your private balance via Jupiter. The result lands back in your encrypted balance.' },
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

/** Privacy Rings only build Solana v1 transactions; wallets advertise what they can sign. */
function supportsV1(w: StdWallet) {
  const f = w.features['solana:signTransaction'] as { supportedTransactionVersions?: readonly (string | number)[] } | undefined
  return !!f?.supportedTransactionVersions?.some((v) => String(v) === '1')
}

const isMobile = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/** Reopens pullhaus inside a mobile wallet's in-app browser, where the wallet is injected. */
function walletBrowseLinks() {
  const url = encodeURIComponent(location.href)
  const ref = encodeURIComponent(location.origin)
  return [
    { name: 'Phantom', href: `https://phantom.app/ul/browse/${url}?ref=${ref}` },
    { name: 'Solflare', href: `https://solflare.com/ul/v1/browse/${url}?ref=${ref}` },
    { name: 'Backpack', href: `https://backpack.app/ul/v1/browse/${url}?ref=${ref}` },
  ]
}

export function WalletPicker({ onDone }: { onDone?: () => void }) {
  const live = useLive()
  const [wallets, setWallets] = useState<StdWallet[] | null>(null)
  useEffect(() => {
    let off: (() => void) | undefined
    let alive = true
    const refresh = () => live.wallets().then((w) => alive && setWallets(w)).catch(() => alive && setWallets([]))
    refresh()
    live.onWalletsChange(refresh).then((u) => { off = u })
    // Some extensions register late without an event; look again shortly after load.
    const t = setTimeout(refresh, 1500)
    return () => { alive = false; off?.(); clearTimeout(t) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  if (!LIVE_AVAILABLE) return <div className="err">Live mode needs a Helius API key. Add VITE_HELIUS_API_KEY and redeploy.</div>
  if (wallets === null) return <div className="hint">Looking for wallets…</div>
  if (!wallets.length) {
    return (
      <div className="stack">
        {isMobile() ? (
          <>
            <p className="hint" style={{ margin: 0 }}>Phone browsers can't see wallet apps. Open pullhaus inside your wallet's browser instead:</p>
            {walletBrowseLinks().map((w) => <a key={w.name} className="btn block" href={w.href}>Open in {w.name}</a>)}
          </>
        ) : (
          <p className="hint" style={{ margin: 0 }}>
            No Solana wallet found in this browser. Install <a className="accent" href="https://phantom.com" target="_blank" rel="noreferrer">Phantom</a>,{' '}
            <a className="accent" href="https://solflare.com" target="_blank" rel="noreferrer">Solflare</a> or{' '}
            <a className="accent" href="https://backpack.app" target="_blank" rel="noreferrer">Backpack</a>, unlock it, then reload this page.
          </p>
        )}
      </div>
    )
  }
  return (
    <div className="stack">
      {wallets.map((w) => {
        const v1 = supportsV1(w)
        return (
          <div key={w.name}>
            <button className="btn block" disabled={!!live.status} onClick={() => live.connect(w).then(onDone).catch(() => {})}>
              <img src={w.icon} alt="" width={18} height={18} />{w.name}
            </button>
            {!v1 && <p className="hint" style={{ margin: '6px 4px 0', fontSize: 12 }}>{w.name} doesn't list support for Solana v1 transactions, which Privacy Rings use. If signing fails, try the Phantom browser extension or Backpack.</p>}
          </div>
        )
      })}
      {live.status && <div className="ok">{live.status}…</div>}
      {live.error && <div className="err" style={{ wordBreak: 'break-word' }}>{live.error}</div>}
    </div>
  )
}

export function Gate({ children }: { children: ReactNode }) {
  const live = useLive()
  if (live.session) return <>{children}</>
  return (
    <div className="gate">
      <Mark size={64} title="pullhaus" />
      <h2>Enter the haus</h2>
      <p className="muted" style={{ maxWidth: 460, margin: '0 auto 22px' }}>
        Connect your Solana wallet and sign once to unlock your private balance. Helius Privacy Rings handle the proofs.
      </p>
      <div className="gate-connect">
        <WalletPicker />
        {CLUSTER === 'mainnet' && <p className="note warn" style={{ margin: '14px 0 0' }}>Mainnet: real funds. Privacy Rings are in beta and pullhaus is unaudited, so start small.</p>}
      </div>
    </div>
  )
}

/** "Connect wallet" in the sidebar opens this. Closes on connect, Escape or backdrop. */
export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const live = useLive()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  useEffect(() => { if (open && live.session) onClose() }, [open, live.session, onClose])
  if (!open) return null
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="connect-title" onClick={(e) => e.stopPropagation()}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="kicker">Privacy Rings · {CLUSTER}</span>
          <button className="side-toggle" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" /></svg>
          </button>
        </div>
        <h3 id="connect-title">Connect wallet</h3>
        <p className="hint" style={{ margin: '0 0 16px' }}>Pick your wallet, then sign once. Signing is free and creates your private keys in this browser.</p>
        <WalletPicker />
      </div>
    </div>
  )
}

/** Kept for compatibility; every room is live or marked coming soon. */
export function SimNote() {
  return null
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
