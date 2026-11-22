import { Link } from 'react-router-dom'
import { Footer, ROOMS, Shape } from '../components/common'
import { RINGS_PROGRAM } from '../lib/config'
import { short } from '../lib/util'

// "Rings" = what the raw Privacy Rings SDK gives a developer; pullhaus = the product on top.
const COMPARE: [string, boolean, boolean][] = [
  ['Encrypted balances (SOL, SPL, Token-2022)', true, true],
  ['Private transfers (asset & amount hidden)', true, true],
  ['Proofs verified on Solana, no L2 or sequencer', true, true],
  ['Multi-recipient transfers (up to 15)', true, true],
  ['Consumer app, explorer & docs', false, true],
  ['Private payment links & QR invoices', false, true],
  ['Payroll UI on multi-transfer', false, true],
  ['Stealth one-time addresses (hides recipient)', false, true],
  ['Hidden limit orders & DCA', false, true],
  ['Anonymous-buyer token launches', false, true],
]

export default function Landing() {

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <div>
            <a className="powered" href="https://www.helius.dev/docs/privacy" target="_blank" rel="noreferrer"><span className="pulse" />Powered by <b>Helius Solana Privacy Rings</b></a>
            <h1>Money with the <em>lights off.</em></h1>
            <p className="lede">
              pullhaus is a private money app built on Helius Privacy Rings. Your balances and amounts are encrypted
              on Solana itself, and you get payment links, payroll, stealth addresses and hidden orders on top.
            </p>
            <div className="row wrapflex">
              <Link to="/app" className="btn yellow">Enter the haus</Link>
              <Link to="/docs" className="btn">How it works</Link>
            </div>
          </div>
          <div className="composition" aria-hidden>
            <div className="sun" /><div className="moon" /><div className="block" /><div className="tri" /><div className="bar" /><div className="ring" />
          </div>
        </div>
      </section>

      <div className="ticker">
        <div><span className="tag">Privacy program</span><b style={{ fontSize: 18 }}>{short(RINGS_PROGRAM, 5, 4)}</b></div>
        <div><span className="tag">Settlement</span><b>Solana L1</b></div>
        <div><span className="tag">Assets</span><b style={{ fontSize: 18 }}>SOL · SPL · T22</b></div>
        <div><span className="tag">Proofs</span><b>Helius prover</b></div>
        <div><span className="tag">Recipients / tx</span><b>up to 15</b></div>
      </div>

      <section className="section">
        <div className="wrap">
          <span className="tag">01 · The rooms</span>
          <h2>Eight rooms. One locked door.</h2>
          <p className="sub">Each room is a different way to use money privately. Vault, Send and Links run live on Privacy Rings today; the rest are in demo while we build them.</p>
          <div className="rooms">
            {ROOMS.map((r) => (
              <Link key={r.id} to={`/app/${r.id}`} className="room">
                <div className="shape"><Shape kind={r.id} /></div>
                <h4>{r.name}</h4>
                <p>{r.blurb}</p>
                <span className="tag">{'isNew' in r && r.isNew ? <span className="new">New in pullhaus</span> : 'Core'}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <span className="tag">02 · Under the hood</span>
          <h2>Deposit. Prove. Settle.</h2>
          <p className="sub">No custodian, no mixer and no sidechain. pullhaus uses Helius Privacy Rings for the cryptography, so every private transaction is checked on Solana itself.</p>
          <div className="steps">
            <div className="step">
              <div className="n red">01</div>
              <h4>Deposit</h4>
              <p>You sign one message to derive your shielded keys and register a <code>shielded address</code>. A deposit turns public SOL or tokens into encrypted notes (UTXOs) in the ring.</p>
            </div>
            <div className="step">
              <div className="n yellow">02</div>
              <h4>Prove</h4>
              <p>To spend, Helius' prover builds a zero-knowledge proof that you own the notes and that the amounts balance. Only <code>nullifiers</code> are revealed, so nothing is spent twice. Your balance is decrypted only in your browser.</p>
            </div>
            <div className="step">
              <div className="n blue">03</div>
              <h4>Settle</h4>
              <p>The Solana Privacy Program (<code>ring1Ga…</code>) verifies the proof on mainnet. There's no L2 and no sequencer between you and the chain.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap split">
          <div>
            <span className="tag">03 · What's hidden, honestly</span>
            <h2>Amounts in the dark. Addresses in the light.</h2>
            <p className="sub" style={{ marginBottom: 24 }}>
              On the Privacy Rings default ring, the asset, amount and your balance are encrypted, but the sender and recipient
              wallets are still visible. pullhaus Stealth pays a fresh one-time address so the recipient can't be linked. Deposits
              into and withdrawals out of the ring are public by design.
            </p>
            <Link to="/docs#privacy" className="btn blue">Read the privacy model</Link>
          </div>
          <div className="card">
            <div className="tablewrap">
              <table className="cmp">
                <thead><tr><th>Feature</th><th>Privacy Rings SDK</th><th>pullhaus</th></tr></thead>
                <tbody>
                  {COMPARE.map(([f, a, b]) => (
                    <tr key={f}><td>{f}</td><td className={a ? 'yes' : 'no'}>{a ? '●' : '—'}</td><td className={b ? 'yes' : 'no'}>{b ? '●' : '—'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <span className="tag">04 · Step inside</span>
          <h2>Turn the<br />lights off.</h2>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link to="/app" className="btn yellow">Enter the haus</Link>
            <Link to="/explorer" className="btn">View explorer</Link>
          </div>
          <p style={{ marginTop: 28 }}><span className="demo-note">Privacy Rings are in beta. pullhaus is unaudited; use small amounts.</span></p>
        </div>
      </section>
      <Footer />
    </>
  )
}
