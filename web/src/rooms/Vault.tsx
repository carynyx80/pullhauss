import { useState } from 'react'
import { AssetSelect, SigLink, useProver } from '../components/common'
import { useLive } from '../lib/live'
import { LIVE_SYMBOLS } from '../lib/config'
import { Balances, RoomHead } from '../pages/AppShell'
import { RELAYER_FEE, useStore } from '../lib/store'
import { ago, short } from '../lib/util'

export default function Vault() {
  const st = useStore()
  const [mode, setMode] = useState<'shield' | 'unshield'>('shield')
  const [asset, setAsset] = useState('SOL')
  const [amt, setAmt] = useState('')
  const [to, setTo] = useState('')
  const [lastSig, setLastSig] = useState('')
  const p = useProver()
  const live = useLive()
  const on = !!live.session
  const liveBal = live.balances.find((b) => b.asset === asset)?.amount ?? 0
  const max = on ? (mode === 'shield' ? 0 : liveBal) : mode === 'shield' ? st.pub[asset] ?? 0 : st.shielded[asset] ?? 0
  const notes = st.notes.filter((n) => !n.spent).sort((a, b) => b.created - a.created)

  return (
    <>
      <RoomHead id="vault" title="Vault" lead="Private balances on Helius Privacy Rings. A deposit becomes encrypted notes in the ring, and only your viewing key can see the total. The deposit itself is public; everything after it is private." />
      <Balances />
      <div className="grid2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="seg" style={{ marginBottom: 16 }}>
            <button className={mode === 'shield' ? 'on' : ''} onClick={() => { setMode('shield'); p.reset() }}>Shield</button>
            <button className={mode === 'unshield' ? 'on' : ''} onClick={() => { setMode('unshield'); p.reset() }}>Withdraw</button>
          </div>
          <div className="stack">
            <label className="field"><span>ASSET</span><AssetSelect value={asset} onChange={setAsset} assets={on ? LIVE_SYMBOLS : st.assets} /></label>
            <label className="field">
              <span>AMOUNT{!(on && mode === 'shield') && ` · max ${max.toLocaleString(undefined, { maximumFractionDigits: 6 })}`}</span>
              <input className="input big" inputMode="decimal" placeholder="0.0" value={amt} onChange={(e) => setAmt(e.target.value)} />
            </label>
            {!(on && mode === 'shield') && <div className="chips">
              {[0.25, 0.5, 1].map((f) => <button key={f} className="chip" onClick={() => setAmt(String(+(max * f).toFixed(6)))}>{f * 100}%</button>)}
            </div>}
            {mode === 'unshield' && (
              <label className="field">
                <span>SEND TO (any Solana address)</span>
                <div className="row">
                  <input className="input mono" placeholder="Fresh wallet address" value={to} onChange={(e) => setTo(e.target.value)} />
                  <button className="btn sm" onClick={() => setTo(on ? live.session!.owner : st.address)}>Mine</button>
                </div>
              </label>
            )}
            {mode === 'unshield' && !on && <div className="dim mono" style={{ fontSize: 12 }}>Relayer fee {RELAYER_FEE * 100}% · gas paid by relayer · destination needs no SOL</div>}
            {mode === 'unshield' && on && <div className="dim mono" style={{ fontSize: 12 }}>Withdrawals are public: the amount and recipient show on-chain. Proof by Helius prover.</div>}
            <button className="btn yellow block" disabled={p.busy || !!live.status} onClick={() => p.run(async () => {
              if (on) {
                if (!(parseFloat(amt) > 0)) throw new Error('Enter an amount above zero.')
                const sig = await live.run(mode === 'shield' ? 'Depositing' : 'Withdrawing', (s) =>
                  mode === 'shield' ? s.deposit(asset, amt) : s.withdraw(asset, amt, to || s.owner))
                setLastSig(sig)
                return mode === 'shield' ? `Deposited ${amt} ${asset} into your private balance.` : `Withdrew ${amt} ${asset}.`
              }
              const v = parseFloat(amt)
              if (mode === 'shield') { st.shield(asset, v); return `Shielded ${v} ${asset}. A new note was added to the tree.` }
              st.unshield(asset, v, to); return `Withdrawal relayed. No link to your deposits.`
            }, { proving: mode === 'unshield', live: on })}>
              {mode === 'shield' ? 'Shield into vault' : 'Prove & withdraw'}
            </button>
          </div>
          {p.view}
          {on && lastSig && <div className="dim" style={{ fontSize: 13, marginTop: 8 }}>Transaction <SigLink sig={lastSig} /></div>}
        </div>
        {on ? (
          <div className="card stack">
            <h3>How your balance is stored</h3>
            <p className="dim" style={{ fontSize: 13, margin: 0 }}>Privacy Rings keep your balance as encrypted UTXOs (notes), not as a normal token account. The Helius indexer only ever sees ciphertext. Your browser decrypts it with keys derived from the one message you signed.</p>
            {live.balances.length === 0 ? <div className="empty">No private balance yet. Deposit to start.</div> : live.balances.map((b) => (
              <div className="list-item" key={b.asset}><span className="badge y">{b.asset}</span><span className="mono grow">{b.amount}</span><span className="dim mono" style={{ fontSize: 12 }}>{b.utxos} notes</span></div>
            ))}
          </div>
        ) : (
        <div className="card">
          <h3>Your notes</h3>
          <p className="dim" style={{ marginTop: 0, fontSize: 13 }}>Only your viewing key can decrypt these. On-chain they are just random commitments.</p>
          {notes.length === 0 ? <div className="empty">No notes yet. Shield something.</div> : notes.slice(0, 10).map((n) => (
            <div className="list-item" key={n.id}>
              <span className="badge y">{n.asset}</span>
              <span className="mono grow">{n.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
              <span className="dim mono" style={{ fontSize: 12 }}>{short(n.commitment, 6, 4)}</span>
              <span className="dim" style={{ fontSize: 12 }}>{ago(n.created)}</span>
            </div>
          ))}
          {notes.length > 10 && <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>+{notes.length - 10} more</div>}
        </div>
        )}
      </div>
    </>
  )
}
