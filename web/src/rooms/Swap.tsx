import { useEffect, useState } from 'react'
import { AssetSelect, SigLink } from '../components/common'
import { useLive } from '../lib/live'
import { FEE_BPS, LIVE_SYMBOLS } from '../lib/config'
import { quoteSwap, SWAP_SLIPPAGE_BPS, type SwapQuote, type SwapResult, type SwapStep } from '../lib/rings'
import { Balances, RoomHead } from '../pages/AppShell'

const DEC: Record<string, number> = { SOL: 9, USDC: 6 }
const human = (raw: string | undefined, sym: string) => (raw ? Number(raw) / 10 ** DEC[sym] : 0)
const n = (v: number, d = 6) => v.toLocaleString(undefined, { maximumFractionDigits: d })

const STEPS: { id: Exclude<SwapStep, 'done'>; label: string; note: string }[] = [
  { id: 'withdraw', label: 'Withdraw', note: 'From your private balance to your wallet' },
  { id: 'swap', label: 'Swap', note: 'On Jupiter, best route' },
  { id: 'deposit', label: 'Deposit', note: 'Back into your private balance' },
]

export default function Swap() {
  const live = useLive()
  const [from, setFrom] = useState('SOL')
  const [to, setTo] = useState('USDC')
  const [amt, setAmt] = useState('')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [qErr, setQErr] = useState('')
  const [step, setStep] = useState<SwapStep | null>(null)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<SwapResult | null>(null)
  const busy = !!step && step !== 'done'
  const bal = live.balances.find((b) => b.asset === from)?.amount ?? 0

  // Live quote, debounced, refreshed every 15s.
  useEffect(() => {
    setQuote(null); setQErr(''); setErr('')
    if (!(parseFloat(amt) > 0)) return
    let off = false
    const get = () => quoteSwap(from, to, amt).then((q) => !off && setQuote(q)).catch((e) => !off && setQErr((e as Error).message))
    const t = setTimeout(get, 350)
    const i = setInterval(get, 15000)
    return () => { off = true; clearTimeout(t); clearInterval(i) }
  }, [from, to, amt])

  const out = human(quote?.outAmount, to)
  const min = human(quote?.otherAmountThreshold, to)
  const fee = out * Number(FEE_BPS) / 10000
  const impact = quote ? Number(quote.priceImpactPct) * 100 : 0
  const route = quote?.routePlan?.map((r) => r.swapInfo?.label).filter(Boolean).join(' → ')

  async function go() {
    setErr(''); setRes(null)
    if (!(parseFloat(amt) > 0)) return setErr('Enter an amount above zero.')
    if (parseFloat(amt) > bal) return setErr(`You have ${n(bal)} ${from} in your private balance. Deposit more in Vault, or lower the amount.`)
    let result: SwapResult | null = null
    try {
      setStep('withdraw')
      await live.run('Swapping', async (s) => {
        result = await s.swap(from, to, amt, setStep)
        return result.depositSig
      })
      setRes(result); setAmt('')
    } catch (e) {
      setStep(null); setErr((e as Error).message)
    }
  }

  const idx = step ? (step === 'done' ? 3 : STEPS.findIndex((s) => s.id === step)) : -1

  return (
    <>
      <RoomHead id="swap" title="Swap" lead="Trade from your private balance. pullhaus withdraws the amount, swaps it on Jupiter and deposits the result back, all from one screen. Your balance stays private. The swap itself is public." />
      <Balances />
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="card stack">
          <label className="field"><span>FROM · private {n(bal)} {from}</span>
            <div className="row">
              <input className="input big grow" inputMode="decimal" placeholder="0.0" value={amt} disabled={busy} onChange={(e) => setAmt(e.target.value)} />
              <div style={{ width: 120 }}><AssetSelect value={from} onChange={(v) => { setFrom(v); if (v === to) setTo(from) }} assets={LIVE_SYMBOLS} /></div>
            </div>
          </label>
          <div className="chips">
            {[0.25, 0.5, 1].map((f) => <button key={f} className="chip" disabled={busy} onClick={() => setAmt(String(+(bal * f).toFixed(DEC[from] === 9 ? 6 : 4)))}>{f * 100}%</button>)}
            <span className="grow" />
            <button className="btn sm" disabled={busy} onClick={() => { setFrom(to); setTo(from) }} aria-label="Flip">⇅ Flip</button>
          </div>
          <label className="field"><span>TO · estimated</span>
            <div className="row">
              <input className="input big grow" readOnly value={out ? n(out - fee) : ''} placeholder="0.0" />
              <div style={{ width: 120 }}><AssetSelect value={to} onChange={(v) => { setTo(v); if (v === from) setFrom(to) }} assets={LIVE_SYMBOLS} /></div>
            </div>
          </label>

          {quote && (
            <div className="mono dim" style={{ fontSize: 12, lineHeight: 1.7 }}>
              <div>1 {from} = {n(out / parseFloat(amt), 4)} {to}{route ? ` · via ${route}` : ''}</div>
              <div>Min received {n(min - min * Number(FEE_BPS) / 10000)} {to} · slippage {SWAP_SLIPPAGE_BPS / 100}%{impact > 0.01 ? ` · impact ${impact.toFixed(2)}%` : ''}</div>
              <div>pullhaus fee {Number(FEE_BPS) / 100}% ≈ {n(fee)} {to} · plus 3 small Solana network fees</div>
            </div>
          )}
          {qErr && <div className="err">{qErr}</div>}

          <button className="btn yellow block" disabled={busy || !!live.status || !quote} onClick={go}>
            {busy ? 'Swapping…' : 'Swap privately'}
          </button>

          {idx >= 0 && (
            <div className="prover">
              {STEPS.map((s, i) => (
                <div key={s.id} className={`st ${i < idx ? 'done' : i === idx ? 'on' : ''}`}>
                  <span>{i < idx ? '■' : i === idx ? '▶' : '□'}</span>{s.label} <span className="dim" style={{ marginLeft: 6 }}>{s.note}</span>
                </div>
              ))}
              <div className="bar-track"><div className="bar-fill" style={{ width: `${(idx / 3) * 100}%` }} /></div>
              {busy && <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>Your wallet asks you to approve each of the 3 steps. Keep this tab open.</div>}
            </div>
          )}
          {err && <div className="err">{err}</div>}
          {res && (
            <div className="ok">
              Swapped into {res.received} {res.asset}, now in your private balance (fee taken on deposit).
              <div className="dim" style={{ fontSize: 13, marginTop: 6, display: 'grid', gap: 2 }}>
                <span>Withdraw <SigLink sig={res.withdrawSig} /></span>
                <span>Swap <SigLink sig={res.swapSig} /></span>
                <span>Deposit <SigLink sig={res.depositSig} /></span>
              </div>
            </div>
          )}
        </div>

        <div className="card stack">
          <h3>What's private, what's not</h3>
          <div className="list-item"><span className="badge y">Private</span><span className="grow">Your total balance, before and after</span></div>
          <div className="list-item"><span className="badge y">Private</span><span className="grow">Your other notes and history in the ring</span></div>
          <div className="list-item"><span className="badge">Public</span><span className="grow">The withdraw, swap and deposit amounts</span></div>
          <div className="list-item"><span className="badge">Public</span><span className="grow">Your wallet address on all three</span></div>
          <p className="dim" style={{ fontSize: 13, margin: 0 }}>Privacy Rings can't trade inside the private pool yet, so a swap briefly leaves it. For launch, swaps cover SOL ↔ USDC. If a step fails, your funds are in your own wallet and you can shield them again from Vault.</p>
        </div>
      </div>
    </>
  )
}
