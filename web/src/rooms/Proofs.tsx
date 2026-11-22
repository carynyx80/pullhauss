import { useState } from 'react'
import { Copy, useProver, SimNote } from '../components/common'
import { RoomHead } from '../pages/AppShell'
import { ASSOCIATION_SETS, useStore } from '../lib/store'
import { ago, short } from '../lib/util'

export default function Proofs() {
  const st = useStore()
  const [set, setSet] = useState(ASSOCIATION_SETS[0].id)
  const [label, setLabel] = useState('')
  const [scope, setScope] = useState<'all' | 'year'>('year')
  const p = useProver()

  return (
    <>
      <RoomHead id="proofs" title="Proofs" lead="Show that you're clean without showing what you own. Prove your notes come from an approved set of deposits, or give a read-only view key to someone you trust." />
      <SimNote />
      <div className="grid2">
        <div className="card stack">
          <h3>Proof of association</h3>
          <p className="dim" style={{ fontSize: 13, margin: 0 }}>A zero-knowledge proof that every unspent note you hold traces back to deposits in the chosen set. The verifier learns nothing else.</p>
          {ASSOCIATION_SETS.map((a) => (
            <label key={a.id} className="card" style={{ cursor: 'pointer', padding: 14, borderColor: set === a.id ? 'var(--accent)' : undefined }}>
              <div className="row"><input type="radio" checked={set === a.id} onChange={() => setSet(a.id)} /><b>{a.label}</b><span className="grow" /><span className="dim mono" style={{ fontSize: 12 }}>{a.size.toLocaleString()} deposits</span></div>
              <div className="dim" style={{ fontSize: 13, marginTop: 4 }}>{a.desc}</div>
            </label>
          ))}
          <button className="btn blue block" disabled={p.busy} onClick={() => p.run(() => {
            const pr = st.makeProof(set)
            return `Proof ready for ${pr.notes} notes. Share the attestation ID with the verifier.`
          })}>Generate proof</button>
          {p.view}
          {st.proofs.map((pr) => (
            <div className="list-item" key={pr.id}>
              <span className="badge g">valid</span>
              <span className="mono grow" style={{ fontSize: 12 }}>{pr.set} · {pr.notes} notes<div className="dim">{short(pr.root, 10, 6)} · {ago(pr.created)} · expires in 30d</div></span>
              <Copy text={`pullhaus-attest:${pr.id}:${pr.root}`} label="Share" />
            </div>
          ))}
        </div>
        <div className="card stack">
          <h3>View keys</h3>
          <p className="dim" style={{ fontSize: 13, margin: 0 }}>A view key lets someone see your incoming and outgoing notes but never spend them. Limit it to one tax year, and revoke it by rotating to a new one.</p>
          <label className="field"><span>LABEL</span><input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Accountant · 2026 taxes" /></label>
          <div className="seg"><button className={scope === 'year' ? 'on' : ''} onClick={() => setScope('year')}>2026 only</button><button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>Full history</button></div>
          <button className="btn yellow block" onClick={() => { st.createViewKey(label, scope); setLabel('') }}>Create view key</button>
          {st.viewKeys.length === 0 ? <div className="empty">No view keys shared.</div> : st.viewKeys.map((k) => (
            <div className="list-item" key={k.id} style={{ opacity: k.revoked ? 0.5 : 1 }}>
              <span className={`badge ${k.revoked ? 'r' : 'g'}`}>{k.revoked ? 'revoked' : k.scope === 'year' ? '2026' : 'all'}</span>
              <span className="grow" style={{ fontSize: 13 }}>{k.label}<div className="mono dim" style={{ fontSize: 11 }}>{short(k.key, 10, 6)}</div></span>
              {!k.revoked && <><Copy text={k.key} /><button className="btn sm" onClick={() => st.revokeViewKey(k.id)}>Revoke</button></>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
