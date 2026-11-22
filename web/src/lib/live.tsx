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
    connect: async (w) => {
      setError('')
      try {
        const { RingsSession } = await rings()
        const s = await RingsSession.connect(w, setStatus)
        setSession(s)
        setBalances(s.balances())
        setStatus('')
      } catch (e) {
        setStatus('')
        setError(friendly(e))
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
        throw new Error(friendly(e))
      } finally {
        setStatus('')
      }
    },
  }
  return <Ctx.Provider value={live}>{children}</Ctx.Provider>
}

function friendly(e: unknown) {
  const m = (e as Error)?.message ?? String(e)
  if (/reject|denied|cancel/i.test(m)) return 'You rejected the request in your wallet.'
  if (/insufficient|not enough|WALLET_INSUFFICIENT/i.test(m)) return 'Not enough balance for this (including fees).'
  if (/WALLET_TOO_MANY_INPUTS/.test(m)) return 'Your balance is split across too many notes. Merge them first, then retry.'
  return m
}

export function useLive() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLive outside provider')
  return v
}
