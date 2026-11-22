import { Link } from 'react-router-dom'
import { Footer, Reveal } from '../components/common'
import { FAQ, FEES, FLOW, STEPS, VISIBILITY } from '../lib/content'

const Vis = ({ v }: { v: 'hidden' | 'visible' }) =>
  v === 'hidden' ? <span className="pill g">Hidden</span> : <span className="pill a">Visible</span>

export default function HowItWorks() {
  return (
    <>
      <section className="hero how-hero">
        <div className="wrap">
          <Reveal><span className="kicker">How it works</span></Reveal>
          <Reveal delay={60}>
            <h1 className="headline">
              Private payments,
              <span className="l2">explained simply.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="lede">
              pullhaus keeps your balances and payment amounts encrypted on Solana. Here's what happens when you use it,
              who's involved, and exactly what stays private.
            </p>
          </Reveal>
          <Reveal delay={160}>
            <nav className="how-toc" aria-label="On this page">
              <a href="#steps">The five steps</a><a href="#flow">Under the hood</a><a href="#visible">What's visible</a><a href="#fees">Fees</a><a href="#faq">FAQ</a>
            </nav>
          </Reveal>
        </div>
      </section>

      <section className="section" id="steps">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="kicker">01 · For you</span>
            <h2 className="title">Five steps, <em>one signature</em></h2>
            <p>The first time takes about a minute. After that, sending privately is as quick as any wallet payment.</p>
          </Reveal>
          <div className="timeline">
            {STEPS.map((s, i) => (
              <Reveal key={s.t} delay={i * 50} className={`tl-step${'key' in s && s.key ? ' key' : ''}`}>
                <div className="tl-num">{String(i + 1).padStart(2, '0')}</div>
                <h4>{s.t}</h4>
                <p>{s.d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="flow">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="kicker">02 · Under the hood</span>
            <h2 className="title">Four parties, <em>no custodian</em></h2>
            <p>pullhaus doesn't run its own privacy system. It's built on Helius Solana Privacy Rings, and your money never passes through us.</p>
          </Reveal>
          <ol className="flow">
            {FLOW.map((f, i) => (
              <Reveal key={f.n} delay={i * 50} className="flow-node">
                <span className="flow-n">{String(i + 1).padStart(2, '0')}</span>
                <h4>{f.n}</h4>
                <p>{f.role}</p>
                <div className="flow-sees"><span className="kicker">Sees</span>{f.sees}</div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="visible">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="kicker">03 · What's visible</span>
            <h2 className="title">Hidden amounts, <em>visible addresses</em></h2>
            <p>This is how the Privacy Rings default ring works, per Helius' documentation. Your balance stays private after every action.</p>
          </Reveal>
          <Reveal delay={60}>
            <div className="board vis-board">
              <table>
                <thead><tr><th>Action</th><th>Asset</th><th>Amount</th><th>Sender</th><th>Recipient</th><th className="num">Balance after</th></tr></thead>
                <tbody>
                  {VISIBILITY.map((v) => (
                    <tr key={v.action}>
                      <td className="lead-cell"><span className="name">{v.action}</span></td>
                      <td data-label="Asset"><Vis v={v.asset} /></td>
                      <td data-label="Amount"><Vis v={v.amount} /></td>
                      <td data-label="Sender"><Vis v={v.sender} /></td>
                      <td data-label="Recipient"><Vis v={v.recipient} /></td>
                      <td className="num" data-label="Balance after">{v.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <p className="note info" style={{ marginTop: 16 }}>
              The transaction hash is always public. Stealth addresses, coming next, will make the recipient a fresh one-time address so payments can't be linked back to you.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section" id="fees">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="kicker">04 · Fees</span>
            <h2 className="title">One flat fee, <em>no surprises</em></h2>
            <p>The person you pay always receives the full amount; the fee is added on top. Solana network fees are separate and tiny.</p>
          </Reveal>
          <Reveal delay={60}>
            <div className="figures" style={{ marginTop: 0 }}>
              {FEES.map((f) => <div className="figure" key={f.label}><span>{f.label}</span><b>{f.value}</b></div>)}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="wrap editorial">
          <Reveal className="lead-col">
            <span className="kicker">05 · Questions</span>
            <h2 className="title">The honest <em>answers</em></h2>
            <p>Can't find what you're looking for? The <Link to="/docs" className="accent">docs</Link> go deeper.</p>
          </Reveal>
          <div className="faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary><span>{f.q}</span><span className="faq-icon" aria-hidden="true" /></summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="cta-band">
              <span className="kicker">Ready?</span>
              <h2 className="headline">
                That's the whole trick.
                <span className="l2">Now pull the cord.</span>
              </h2>
              <p>Connect a wallet, sign once, and try it with a small amount first.</p>
              <div className="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/app" className="btn primary lg">Enter the haus</Link>
                <Link to="/docs" className="btn ghost lg">Read the docs</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
      <Footer />
    </>
  )
}
