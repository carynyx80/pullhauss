import { Link, useNavigate } from 'react-router-dom'
import { Reveal, Ticker } from '../components/common'
import { Wordmark } from '../components/Mark'
import { TokenBlock } from '../components/Token'

/** The front door: one big button into the app. */
export default function Splash() {
  const go = useNavigate()
  return (
    <main className="splash">
      <header className="splash-top">
        <span className="logo"><Wordmark size={24} /></span>
        <a className="powered" href="https://www.helius.dev/docs/privacy" target="_blank" rel="noreferrer">
          Powered by <b>Helius Privacy Rings</b>
        </a>
      </header>
      <Ticker />

      <section className="splash-center">
        <Reveal>
          <span className="eyebrow"><span className="pulse" />Live on Solana · <b>private by default</b></span>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="headline">
            Private money on Solana.
            <span className="l2">With the lights off.</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="lede">
            Hold, send and get paid with your balances and amounts encrypted on-chain. One wallet signature and you're in.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <button className="enter" onClick={() => go('/app')} autoFocus>
            Enter the haus <span className="arrow" aria-hidden="true">→</span>
          </button>
        </Reveal>
        <Reveal delay={240} className="splash-token">
          <TokenBlock compact />
        </Reveal>
      </section>

      <footer className="splash-foot">
        <Link to="/how-it-works">How it works</Link>
        <Link to="/about">About</Link>
        <Link to="/docs">Docs</Link>
        <Link to="/explorer">Explorer</Link>
      </footer>
    </main>
  )
}
