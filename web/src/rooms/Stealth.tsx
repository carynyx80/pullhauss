import { useState } from 'react'
import { Copy, useProver, SimNote } from '../components/common'
import { RoomHead } from '../pages/AppShell'
import { useStore } from '../lib/store'
import { ago, short } from '../lib/util'
import { Qr } from './Links'

export default function Stealth() {
  const st = useStore()
  const [scanning, setScanning] = useState(false)
  const p = useProver()
  const k = st.stealth

  return (
    <>
      <RoomHead id="stealth" title="Stealth" lead="Post one public meta-address anywhere: your bio, website or invoice. Every payer creates a brand-new one-time address that only you can find and spend from." />
      <SimNote />
      {!k ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <p className="muted">You don't have a stealth meta-address yet.</p>
          <button className="btn yellow" onClick={st.genStealth}>Generate meta-address</button>
        </div>
      ) : (
        <div className="grid2">
          <div className="card stack">
            <h3>Your meta-address</h3>
            <div className="row wrapflex" style={{ alignItems: 'flex-start', gap: 18 }}>
              <Qr text={k.meta} />
              <div className="stack grow" style={{ minWidth: 200 }}>
                <div className="mono break" style={{ fontSize: 12 }}>{k.meta}</div>
                <div className="row"><Copy text={k.meta} /><button className="btn sm" onClick={() => confirm('Rotate keys? Old meta-address will stop receiving.') && st.genStealth()}>Rotate</button></div>
              </div>
            </div>
            <div className="prover" style={{ lineHeight: 1.8 }}>
              <div><span className="dim">spend pubkey</span> {short(k.spendPub, 8, 8)}</div>
              <div><span className="dim">view pubkey </span> {short(k.viewPub, 8, 8)}</div>
            </div>
            <p className="dim" style={{ fontSize: 13 }}>
              A payer picks a random ephemeral key <span className="mono">r</span>, works out <span className="mono">P = S + H(r·V)·G</span>, pays to <span className="mono">P</span>,
              and calls <span className="mono">announce(R, view_tag)</span>. You scan the announcements with your view key, and the 1-byte view tag skips 255 out of 256 of them.
            </p>
          </div>
          <div className="card">
            <div className="row between"><h3>Incoming</h3>
              <div className="row">
                <button className="btn sm" onClick={st.simulateIncoming}>Simulate a payment</button>
                <button className="btn sm" disabled={scanning} onClick={async () => { setScanning(true); await new Promise((r) => setTimeout(r, 900)); setScanning(false) }}>{scanning ? 'Scanning…' : 'Scan'}</button>
              </div>
            </div>
            {k.received.length === 0 ? <div className="empty" style={{ marginTop: 12 }}>Nothing received yet.</div> : k.received.map((r) => (
              <div className="list-item" key={r.addr}>
                <span className="badge y">{r.asset}</span>
                <span className="mono grow">{r.amount}<div className="dim" style={{ fontSize: 11 }}>{short(r.addr, 6, 6)} · tag 0x{r.viewTag} · {ago(r.time)}</div></span>
                {r.swept ? <span className="badge g">in vault</span> : <button className="btn sm" disabled={p.busy} onClick={() => p.run(() => { st.sweep(r.addr); return 'Swept into your vault. The one-time address is now empty and never used again.' })}>Sweep to vault</button>}
              </div>
            ))}
            {p.view}
          </div>
        </div>
      )}
    </>
  )
}
