/** Shared marketing/explainer copy used by About and How it works. */

export const STEPS = [
  { t: 'Connect', d: 'Open your Solana wallet. Phantom, Solflare and Backpack all work.' },
  { t: 'Sign once', d: 'One message derives your private keys. They never leave your browser.' },
  { t: 'Deposit', d: 'Move SOL or USDC into your encrypted balance on Privacy Rings.' },
  { t: 'Prove', d: "Helius' prover builds a zero-knowledge proof that the amounts add up.", key: true },
  { t: 'Settle', d: 'Solana verifies the proof on-chain. No L2, no sequencer, no custodian.' },
] as const

export const HONEST = [
  { t: 'Amounts and assets are encrypted', d: 'What you hold and what you send is ciphertext on-chain. Only your viewing key can read it.' },
  { t: 'Your balance is yours to read', d: 'The Helius indexer only sees encrypted notes. Your browser decrypts them locally.' },
  { t: 'Addresses stay visible', d: 'On the default ring, the two wallets in a transfer are public. Stealth addresses will hide the recipient.' },
  { t: 'Entering and leaving is public', d: 'Deposits into the ring and withdrawals out of it show on-chain, by design.' },
  { t: 'A flat 0.25% fee', d: 'Paid privately to the pullhaus treasury inside the same transaction. Recipients get the full amount.' },
] as const

/** Who touches a private payment, and what each party can see. */
export const FLOW = [
  { n: 'Your browser', role: 'Holds your private keys, builds the transaction and decrypts your balance.', sees: 'Everything, because it is you.' },
  { n: 'Your wallet', role: 'Signs once to create your keys, then approves every transaction.', sees: 'The transaction you approve.' },
  { n: 'Helius prover', role: 'Generates the zero-knowledge proof that your inputs equal your outputs.', sees: 'Proof inputs for that one transaction, not your keys.' },
  { n: 'Solana', role: "The Privacy Rings program checks the proof and records encrypted notes.", sees: 'Ciphertext, nullifiers and the two wallet addresses.' },
] as const

type Vis = 'hidden' | 'visible'
/** Per-action visibility on the Privacy Rings default ring (from Helius' docs). */
export const VISIBILITY: { action: string; asset: Vis; amount: Vis; sender: Vis; recipient: Vis; after: string }[] = [
  { action: 'Deposit (public → private)', asset: 'visible', amount: 'visible', sender: 'visible', recipient: 'visible', after: 'Private' },
  { action: 'Private transfer', asset: 'hidden', amount: 'hidden', sender: 'visible', recipient: 'visible', after: 'Private' },
  { action: 'Payroll (up to 15)', asset: 'hidden', amount: 'hidden', sender: 'visible', recipient: 'visible', after: 'Private' },
  { action: 'Withdraw (private → public)', asset: 'visible', amount: 'visible', sender: 'visible', recipient: 'visible', after: 'Private' },
]

export const FEES = [
  { label: 'Deposit', value: '0%' },
  { label: 'Private send', value: '0.25%' },
  { label: 'Payroll', value: '0.25%' },
  { label: 'Payment link', value: '0.25%' },
  { label: 'Withdraw', value: '0%' },
] as const

export const FAQ = [
  {
    q: 'Does pullhaus hold my money?',
    a: "No. Your funds sit in Helius' Privacy Rings program on Solana, and only your keys can spend them. pullhaus never holds funds or keys. Every transaction is approved in your own wallet.",
  },
  {
    q: 'Where do my private keys live?',
    a: "In your browser's memory, for as long as the tab is open. They're derived from one message your wallet signs, so signing the same message again on any device gets you the same keys back.",
  },
  {
    q: 'What if I lose my wallet?',
    a: "Your private balance is tied to your Solana wallet. If you lose access to the wallet (its seed phrase), you lose access to the private balance too. Back up your wallet like you normally would.",
  },
  {
    q: 'What can Helius see?',
    a: "Helius runs the prover and the indexer. The indexer only stores encrypted notes, and the prover sees the inputs for a proof but never your keys. Like any RPC provider, Helius can see network metadata such as your IP address.",
  },
  {
    q: 'Is it completely anonymous?',
    a: "No, and we won't pretend otherwise. On the default ring, amounts and balances are hidden but the two wallet addresses in a transfer are visible, and deposits and withdrawals are public. Stealth addresses, coming next, will hide who gets paid.",
  },
  {
    q: 'Who gets the 0.25% fee?',
    a: 'The pullhaus company treasury. On private transfers it is paid as an extra private output in the same transaction, so its amount is encrypted too. The person you pay always receives the full amount.',
  },
  {
    q: 'Is it audited?',
    a: "Privacy Rings are built and operated by Helius; see Helius' security documentation for their audits. pullhaus itself has not been audited yet, and Privacy Rings are in beta, so start with small amounts.",
  },
] as const
