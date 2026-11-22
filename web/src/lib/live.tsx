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
        throw new Error(friendly(e))
      } finally {
        setStatus('')
      }
    },
  }
  return <Ctx.Provider value={live}>{children}</Ctx.Provider>
}

function friendly(e: unknown) {
  const err = e as { message?: string; code?: string | number; details?: unknown; cause?: { message?: string } }
  const raw = [err?.message ?? String(e), err?.code && String(err.code) !== err?.message ? `code ${err.code}` : '', err?.cause?.message ? `cause: ${err.cause.message}` : '']
    .filter(Boolean).join(' · ')
  const m = raw
  if (/user rejected|rejected the request|user denied|cancelled by user|4001/i.test(m)) return `You declined the request in your wallet. (${raw})`
  if (/insufficient|not enough|WALLET_INSUFFICIENT/i.test(m)) return 'Not enough balance for this (including fees).'
  if (/WALLET_TOO_MANY_INPUTS/.test(m)) return 'Your balance is split across too many notes. Merge them first, then retry.'
  return `Wallet error: ${raw}`
}

export function useLive() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useLive outside provider')
  return v
}
