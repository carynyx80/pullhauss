import { useMemo, useState } from 'react'
import { Footer } from '../components/common'
import { useStore } from '../lib/store'
import { useLive } from '../lib/live'
import { CLUSTER, RINGS_PROGRAM, explorerTx } from '../lib/config'
import { ago, short } from '../lib/util'

const ACCOUNTS = [
  ['Solana Privacy Program', RINGS_PROGRAM],
  ['User Registry Program', 'regy3WAeRXMYuMYxr5iK3Bf9Arr3PcxGxyzAddbiqDQ'],
  ['State Merkle tree', '777pvSGe5LaBd9nCczvE2FXEauiwtfGJ5XRpjKyniGor'],
  ['Native SOL interface', 'CiNmas621VuyofiDSrEPfTXHKrdZuB6jMKECyNiMpLXE'],
]
const acct = (a: string) => `https://orbmarkets.io/address/${a}${CLUSTER === 'devnet' ? '?cluster=devnet' : ''}`

export default function Explorer() {
  const { blocks } = useStore()
  const live = useLive()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const tip = blocks[blocks.length - 1]
  const txs = useMemo(() => blocks.flatMap((b) => b.txs.map((t) => ({ ...t, block: b.height, time: b.time }))).reverse(), [blocks])
  const query = q.trim()
  const filteredBlocks = [...blocks].reverse().filter((b) => !query || String(b.height).includes(query) || b.hash.includes(query))
  const filteredTxs = txs.filter((t) => !query || t.id.includes(query) || t.kind.includes(query))
  const block = sel !== null ? blocks.find((b) => b.height === sel) : null

  return (
    <>
      <div className="wrap" style={{ paddingTop: 36, paddingBottom: 80 }}>
        <span className="kicker">Ring explorer · {CLUSTER}</span>
        <h1 className="headline" style={{ fontSize: 'clamp(36px, 4.6vw, 52px)', margin: '12px 0 28px' }}>
          Public chain.<span className="l2">Private amounts.</span>
        </h1>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Privacy Rings on Solana</h3>
          <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>Every pullhaus private transaction runs through these accounts. Open them on Orb to see real activity: amounts and assets show up as ciphertext.</p>
          {ACCOUNTS.map(([n, a]) => (
            <div className="list-item" key={a}><span className="grow">{n}</span><a className="mono" href={acct(a)} target="_blank" rel="noreferrer">{short(a, 6, 6)} ↗</a></div>
          ))}
          {live.lastSig && <div className="list-item"><span className="grow">Your last transaction</span><a className="mono" href={explorerTx(live.lastSig)} target="_blank" rel="noreferrer">{short(live.lastSig, 6, 6)} ↗</a></div>}
        </div>
        <span className="demo-note" style={{ marginBottom: 14 }}>Below: simulated feed for the demo. Live data is on Orb via the links above.</span>
        <div className="figures" style={{ margin: '14px 0 24px' }}>
          <div className="figure"><span>Slot (sim)</span><b>{tip.height.toLocaleString()}</b></div>
          <div className="figure"><span>Txs in window</span><b>{txs.length}</b></div>
          <div className="figure"><span>Your demo txs</span><b className="yellow">{txs.filter((t) => t.mine).length}</b></div>
          <div className="figure"><span>Program</span><b style={{ fontSize: 16 }}>{short(RINGS_PROGRAM, 4, 4)}</b></div>
          <div className="figure"><span>Cluster</span><b>{CLUSTER}</b></div>
        </div>
        <input className="input mono" placeholder="Search the simulated feed: slot, hash, signature or type…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 20 }} />

        {block && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="row between"><h3>Slot {block.height.toLocaleString()} (simulated)</h3><button className="btn sm" onClick={() => setSel(null)}>Close</button></div>
            <div className="prover break" style={{ marginTop: 10, lineHeight: 1.8 }}>
              <div><span className="dim">hash</span> 0x{block.hash}</div>
              <div><span className="dim">time</span> {new Date(block.time).toLocaleString()}</div>
              <div><span className="dim">txs</span> {block.txs.length}</div>
              
            </div>
          </div>
        )}

        <div className="grid2">
          <div className="card">
            <h3>Slots (simulated)</h3>
            <div className="tablewrap"><table className="t"><thead><tr><th>Slot</th><th>Hash</th><th>Txs</th><th>Age</th></tr></thead><tbody>
              {filteredBlocks.slice(0, 18).map((b) => (
                <tr key={b.height} style={{ cursor: 'pointer' }} onClick={() => setSel(b.height)} className={b.txs.some((t) => t.mine) ? 'mine' : ''}>
                  <td>{b.height.toLocaleString()}</td><td className="dim">{short(b.hash, 6, 4)}</td><td>{b.txs.length}</td>
                  <td className="dim">{ago(b.time)}</td>
                </tr>
              ))}
            </tbody></table></div>
          </div>
          <div className="card">
            <h3>Transactions</h3>
            <div className="tablewrap"><table className="t"><thead><tr><th>Signature</th><th>Type</th><th>Null.</th><th>Comm.</th><th>Block</th></tr></thead><tbody>
              {filteredTxs.slice(0, 18).map((t) => (
                <tr key={t.id + t.block} className={t.mine ? 'mine' : ''}>
                  <td className="dim">{short(t.id, 6, 4)}</td><td>{t.kind}{t.mine && <span className="yellow"> · you</span>}</td><td>{t.nullifiers}</td><td>{t.commitments}</td><td className="dim">{t.block}</td>
                </tr>
              ))}
            </tbody></table></div>
            <p className="dim" style={{ fontSize: 12 }}>Amounts, senders and receivers are never shown because the chain doesn't store them. Your own txs are highlighted only in your browser.</p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
