import { Link } from 'react-router-dom'
import { RoomHead } from '../pages/AppShell'

/** Rooms that aren't live on Privacy Rings yet. No simulated balances, no fake actions. */
const SOON: Record<string, { title: string; lead: string; points: string[] }> = {
  forge: {
    title: 'Forge',
    lead: "Launch a token on a fair bonding curve where buyers pay from private balances, so there are no wallets to snipe or copy.",
    points: ['Fixed supply, linear bonding curve', 'Buyers pay through one-time accounts funded privately', 'Ships after the pullhaus program is deployed and reviewed'],
  },
  orders: {
    title: 'Orders',
    lead: 'Hidden limit orders and DCA. Your price and size stay sealed until a keeper fills them.',
    points: ['Limit and DCA orders from your private balance', 'Terms committed as a hash, revealed only at fill time', 'Payout is fixed in the order, so a keeper can never redirect it'],
  },
  stealth: {
    title: 'Stealth',
    lead: 'Publish one meta-address. Every payer sends to a fresh one-time address that only you can find and spend.',
    points: ['Hides who is getting paid, on top of hidden amounts', 'One public address for your bio, invoices and tips', 'Payments sweep into your private balance automatically'],
  },
  proofs: {
    title: 'Proofs',
    lead: 'Prove your funds are clean without revealing which deposits are yours, and share read-only view keys when you choose.',
    points: ['Association-set proofs for exchanges and partners', 'View keys scoped to one tax year, revocable', 'Depends on Helius custom rings with compliance controls'],
  },
}

export function SoonRoom({ id }: { id: keyof typeof SOON | string }) {
  const r = SOON[id]
  if (!r) return null
  return (
    <>
      <RoomHead id={id} title={r.title} lead={r.lead} />
      <div className="card soon-card">
        <span className="pill a">Coming soon</span>
        <ul className="soon-list">
          {r.points.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <p className="hint" style={{ margin: 0 }}>
          Live today: <Link className="accent" to="/app/vault">Vault</Link>, <Link className="accent" to="/app/send">Send</Link> (with payroll) and{' '}
          <Link className="accent" to="/app/links">Links</Link>, all on Helius Privacy Rings.
        </p>
      </div>
    </>
  )
}
