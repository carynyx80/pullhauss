import { Footer } from '../components/common'
import { useLive } from '../lib/live'
import { CLUSTER, RINGS_PROGRAM, TREASURY, explorerAddr, explorerTx } from '../lib/config'
import { short } from '../lib/util'

/** Real on-chain accounts only. No simulated feed. */
const ACCOUNTS: [string, string, string][] = [
  ['Solana Privacy Program', RINGS_PROGRAM, 'Verifies every private transaction.'],
  ['User Registry Program', 'regy3WAeRXMYuMYxr5iK3Bf9Arr3PcxGxyzAddbiqDQ', 'Shielded addresses people can pay.'],
  ['State Merkle tree', '777pvSGe5LaBd9nCczvE2FXEauiwtfGJ5XRpjKyniGor', 'Encrypted notes (balances) live here.'],
  ['Native SOL interface', 'CiNmas621VuyofiDSrEPfTXHKrdZuB6jMKECyNiMpLXE', 'Holds SOL deposited into the ring.'],
  ['pullhaus treasury', TREASURY, 'Receives the 0.25% app fee.'],
]

export default function Explorer() {
  const live = useLive()
  return (
    <>
      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <span className="kicker">Ring explorer · {CLUSTER}</span>
        <h1 className="headline" style={{ fontSize: 'clamp(36px, 4.6vw, 52px)', margin: '12px 0 14px' }}>
          Public chain.<span className="l2">Private amounts.</span>
        </h1>
        <p className="lede" style={{ marginBottom: 28 }}>
          Every pullhaus transaction runs through these Solana accounts. Open any of them on Orb to see real activity:
          assets and amounts show up as ciphertext.
        </p>

        <div className="board">
          <table>
            <thead><tr><th>Account</th><th>What it does</th><th className="num">Address</th></tr></thead>
            <tbody>
              {ACCOUNTS.map(([name, addr, what]) => (
                <tr key={addr} onClick={() => window.open(explorerAddr(addr), '_blank', 'noopener')}>
                  <td className="lead-cell"><span className="name">{name}</span></td>
                  <td data-label="What it does" style={{ fontFamily: 'var(--sans)' }}>{what}</td>
                  <td className="num" data-label="Address">
                    <a href={explorerAddr(addr)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{short(addr, 6, 6)} ↗</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <h3>Your activity</h3>
          {live.session ? (
            live.lastSig ? (
              <p style={{ margin: 0 }}>Last transaction: <a className="accent mono" href={explorerTx(live.lastSig)} target="_blank" rel="noopener noreferrer">{short(live.lastSig, 8, 8)} ↗</a></p>
            ) : (
              <p className="hint" style={{ margin: 0 }}>No transactions yet this session. Your wallet's full history is on <a className="accent" href={explorerAddr(live.session.owner)} target="_blank" rel="noopener noreferrer">Orb ↗</a>.</p>
            )
          ) : (
            <p className="hint" style={{ margin: 0 }}>Connect a wallet in the app to see links to your own transactions here.</p>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
