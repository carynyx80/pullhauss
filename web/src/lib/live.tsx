import { createContext, ReactNode, useCallback, useContext, useState } from 'react'
import type { Wallet as StdWallet } from '@wallet-standard/base'
import type { LiveBalance, RingsSession as RingsSessionT } from './rings'

/*
 * Live mode: a real wallet on Helius Privacy Rings. The SDK is loaded on
 * demand so the landing page and demo mode stay light.
 */

type Live = {
  session: RingsSessionT | null
  status: string
  error: string
  balances: LiveBalance[]
  lastSig: string
  wallets(): Promise<StdWallet[]>
  onWalletsChange(cb: () => void): Promise<() => void>
  connect(w: StdWallet): Promise<void>
  disconnect(): Promise<void>
  refresh(): Promise<void>
  /** Runs a Rings action, keeps status/balances in sync, returns the signature. */
  run(label: string, f: (s: RingsSessionT) => Promise<string>): Promise<string>
}

const Ctx = createContext<Live | null>(null)
const rings = () => import('./rings')

export function LiveProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<RingsSessionT | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [balances, setBalances] = useState<LiveBalance[]>([])
  const [lastSig, setLastSig] = useState('')

  const refresh = useCallback(async () => {
    if (!session) return
    await session.sync()
    setBalances(session.balances())
  }, [session])

  const live: Live = {
    session, status, error, balances, lastSig,
    wallets: async () => (await rings()).RingsSession.wallets(),
    onWalletsChange: async (cb) => (await rings()).RingsSession.onWalletsChange(cb),
    connect: async (w) => {
      setError('')
      let lastStep = 'Connecting wallet'
      try {
        const { RingsSession } = await rings()
        const s = await RingsSession.connect(w, (st) => { lastStep = st; setStatus(st) })
        setSession(s)
        setBalances(s.balances())
        setStatus('')
      } catch (e) {
        setStatus('')
        setError(`Failed at "${lastStep}": ${friendly(e)}`)
        console.error('[pullhaus] wallet connect failed at', lastStep, e)
        throw e
      }
    },
    disconnect: async () => {
      await session?.disconnect()
      setSession(null)
      setBalances([])
    },
    refresh,
    run: async (label, f) => {
      if (!session) throw new Error('Connect a wallet first.')
      setError('')
      setStatus(label)
      try {
        const sig = await f(session)
        setLastSig(sig)
        setBalances(session.balances())
        return sig
      } catch (e) {
        logChain(label, e)
        throw new Error(friendly(e))
      } finally {
        setStatus('')
      }
    },
  }
  return <Ctx.Provider value={live}>{children}</Ctx.Provider>
}

/** Full SDK error chain (codes + details) in the console, for support. */
function logChain(label: string, e: unknown) {
  const out: unknown[] = []
  let c = e as { name?: string; code?: string; message?: string; details?: unknown; cause?: unknown } | undefined
  for (let i = 0; c && i < 8; i++) { out.push({ code: c.code ?? c.name, message: c.message, details: c.details }); c = c.cause as typeof c }
  console.error(`[pullhaus] ${label} failed`, JSON.stringify(out, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)))
}

function friendly(e: unknown) {
  // Walk the whole SDK error chain: the useful code is usually the innermost one.
  const codes: string[] = []
  let deepest = ''
  let c = e as { code?: string; name?: string; message?: string; cause?: unknown } | undefined
  for (let i = 0; c && i < 8; i++) {
    const code = String(c.code ?? c.name ?? '')
    if (code) codes.push(code)
    if (c.message) deepest = c.message
    c = c.cause as typeof c
  }
  const all = codes.join(' ') + ' ' + deepest
  if (/user rejected|rejected the request|user denied|cancelled by user|4001/i.test(all)) return 'You declined the request in your wallet.'
  if (/WALLET_INSUFFICIENT_BALANCE/.test(all)) return "Not enough private balance in that asset. Check the asset you picked, or deposit more in Vault."
  if (/insufficient (funds|lamports)|insufficient funds for rent/i.test(all)) return 'Not enough SOL in your wallet to cover this and the network fee.'
  if (/WALLET_TOO_MANY_INPUTS/.test(all)) return 'Your balance is split across too many notes. Try a smaller amount, or merge first.'
  if (/version|VersionedTransaction|unsupported transaction/i.test(all)) return "Your wallet can't sign the new Solana v1 transactions Privacy Rings use. Use the Phantom browser extension or Backpack."
  return `Something went wrong: ${codes[codes.length - 1] ?? ''} ${deepest}`.trim()
}

export function useLive() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLive outside provider')
  return v
}
