import { Link, useNavigate } from 'react-router-dom'
import { Footer, Reveal, ROOMS, Shape } from '../components/common'
import { HONEST, STEPS } from '../lib/content'
import { TokenBlock } from '../components/Token'
import { HAUS_LIVE } from '../lib/config'

/** Which rooms run on Helius Privacy Rings today, and their fee/proof source. */
const LIVE: Record<string, { fee: string; proof: string }> = {
  vault: { fee: '0.00%', proof: 'Helius' },
  send: { fee: '0.25%', proof: 'Helius' },
  swap: { fee: '0.25%', proof: 'Helius + Jupiter' },
  links: { fee: '0.25%', proof: 'Helius' },
}



export default function Landing() {
  const go = useNavigate()
  return (
    <>
      <section className="hero">
        <div className="wrap">
          <Reveal>
            <a className="eyebrow" href="https://www.helius.dev/docs/privacy" target="_blank" rel="noreferrer">
              <span className="pulse" />Built on <b>Helius Solana Privacy Rings</b>
            </a>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="headline">
              Solana payments are public.
              <span className="l2">Yours don't have to be.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="lede">
              pullhaus is a private money app. Balances and amounts are encrypted on Solana itself, with payment links,
              payroll and hidden orders on top.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="ctas">
              <Link to="/app" className="btn primary lg">Enter the haus</Link>
              <Link to="/how-it-works" className="btn ghost lg">How it works</Link>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <div className="figures">
              <div className="figure"><span>App fee</span><b>0.25%</b></div>
              <div className="figure"><span>Recipients per transfer</span><b>15</b></div>
              <div className="figure"><span>Settlement</span><b>Solana L1</b></div>
              <div className="figure"><span>Rooms live on Rings</span><b>3 of 8</b></div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="kicker">The board</span>
            <h2 className="title">Eight rooms, <em>one haus</em></h2>
            <p>Each room is a different way to use money privately. Four run live on Privacy Rings today; the rest are coming soon.</p>
          </Reveal>
          <Reveal delay={60}>
            <div className="board">
              <table>
                <thead><tr><th>Room</th><th>Status</th><th className="num">Fee</th><th className="num">Proofs</th></tr></thead>
                <tbody>
                  {ROOMS.map((r) => {
                    const live = LIVE[r.id]
                    return (
                      <tr key={r.id} onClick={() => go(`/app/${r.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`/app/${r.id}`)}>
                        <td className="lead-cell">
                          <div className="who">
                            <span className="avatar"><Shape kind={r.id} size={20} /></span>
                            <div>
                              <span className="name">{r.name}</span><span className="sym">{r.id.toUpperCase()}</span>
                              <div className="desc">{r.blurb}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Status">{live ? <span className="pill g">Live on Rings</span> : <span className="pill a">Coming soon</span>}</td>
                        <td className="num" data-label="Fee">{live?.fee ?? '—'}</td>
                        <td className="num" data-label="Proofs">{live?.proof ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="how">
        <div className="wrap">
          <Reveal className="section-head">
            <span className="kicker">How it works</span>
            <h2 className="title">A private payment, <em>in five steps</em></h2>
            <p>No custodian, no mixer and no sidechain. Helius Privacy Rings handle the cryptography, and Solana checks every proof.</p>
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

      <section className="section">
        <div className="wrap editorial">
          <Reveal className="lead-col">
            <span className="kicker">What's private</span>
            <h2 className="title">Honest privacy, <em>spelled out</em></h2>
            <p>Privacy tools tend to overpromise. Here's exactly what the Privacy Rings default ring hides, and what it doesn't.</p>
          </Reveal>
          <ol className="ed-list">
            {HONEST.map((h, i) => (
              <li key={h.t}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <div><h4>{h.t}</h4><p>{h.d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section" id="haus">
        <div className="wrap token-split">
          <Reveal>
            <span className="kicker">$HAUS</span>
            <h2 className="title">The official token, <em>{HAUS_LIVE ? 'now live' : 'coming soon'}</em></h2>
            <p>$HAUS is the official token of pullhaus. {HAUS_LIVE ? 'Copy the contract address or buy it on pump.fun.' : 'The contract address and the buy link will appear here the moment it launches on pump.fun.'}</p>
          </Reveal>
          <Reveal delay={60}><TokenBlock /></Reveal>
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="wrap">
          <Reveal>
            <div className="cta-band">
              <span className="kicker">Step inside</span>
              <h2 className="headline">
                Your money, your haus.
                <span className="l2">Pull the cord.</span>
              </h2>
              <p>Connect a wallet, sign once, and your balance goes dark. Privacy Rings are in beta, so start small.</p>
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
