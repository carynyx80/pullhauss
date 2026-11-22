/** Defaults to mainnet. Set VITE_SPR_CLUSTER=devnet for testing. */
export const CLUSTER: 'devnet' | 'mainnet' = import.meta.env.VITE_SPR_CLUSTER === 'devnet' ? 'devnet' : 'mainnet'
export const LIVE_AVAILABLE = Boolean(import.meta.env.VITE_HELIUS_API_KEY)
export const RINGS_PROGRAM = 'ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW'
export const LIVE_SYMBOLS = ['SOL', 'USDC']

/** pullhaus company treasury: receives app fees, owns the program, shown publicly. */
export const TREASURY = '6T9AvUXqBnSrSxwdLmUnxttgdkSqyWDUQUcYqZf7mkpv'
/** App fee in basis points (25 = 0.25%), charged on private transfers, payroll and payment links. */
export const FEE_BPS = 25n

export const explorerTx = (sig: string) => `https://orbmarkets.io/tx/${sig}${CLUSTER === 'devnet' ? '?cluster=devnet' : ''}`
export const explorerAddr = (a: string) => `https://orbmarkets.io/address/${a}${CLUSTER === 'devnet' ? '?cluster=devnet' : ''}`
