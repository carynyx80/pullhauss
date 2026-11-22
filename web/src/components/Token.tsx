import { useState } from 'react'
import { HAUS, HAUS_LIVE } from '../lib/config'

/**
 * $HAUS token block: contract address with copy, then a big "Buy $HAUS" box
 * that opens pump.fun. Shows a "coming soon" state until HAUS.ca and
 * HAUS.buyUrl are set in lib/config.ts.
 */
export function TokenBlock({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    if (!HAUS_LIVE) return
    navigator.clipboard?.writeText(HAUS.ca).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <div className={`haus${compact ? ' compact' : ''}`}>
      <div className="haus-head">
        <span className="kicker">Official token</span>
        {HAUS_LIVE ? <span className="pill g">Live</span> : <span className="pill a">Coming soon</span>}
      </div>
      <h3 className="haus-sym">{HAUS.symbol}</h3>
      <p className="haus-sub">The official token of pullhaus.</p>

      <div className="haus-ca">
        <span className="haus-ca-label">CA:</span>
        <span className={`haus-ca-value${HAUS_LIVE ? '' : ' soon'}`} title={HAUS_LIVE ? HAUS.ca : undefined}>
          {HAUS_LIVE ? HAUS.ca : 'Coming soon'}
        </span>
        <button className="btn sm" onClick={copy} disabled={!HAUS_LIVE} aria-label="Copy contract address">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      {HAUS_LIVE ? (
        <a className="haus-buy" href={HAUS.buyUrl} target="_blank" rel="noopener noreferrer">
          <span>
            <b>Buy {HAUS.symbol}</b>
            <small>on pump.fun</small>
          </span>
          <span className="haus-arrow" aria-hidden="true">↗</span>
        </a>
      ) : (
        <div className="haus-buy disabled" aria-disabled="true">
          <span>
            <b>Buy {HAUS.symbol}</b>
            <small>Opens at launch</small>
          </span>
          <span className="haus-arrow" aria-hidden="true">↗</span>
        </div>
      )}

      <p className="haus-note">Only trust the contract address shown on this site. Not financial advice.</p>
    </div>
  )
}
