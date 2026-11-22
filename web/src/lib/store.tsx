import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { b58, hex, load, rid, save } from './util'

/*
 * Demo state for the pullhaus frontend.
 *
 * Everything here is simulated in the browser so the UI can be built and
 * demoed before the on-chain program is deployed. Each action mirrors a real
 * instruction in programs/pullhaus (see the comment on each one), so wiring
 * the real client later means swapping the body of these functions.
 */

export type Asset = string
export type Note = { id: string; asset: Asset; amount: number; spent: boolean; created: number; commitment: string; tainted?: boolean }
export type Activity = { id: string; kind: string; detail: string; time: number; sig: string }
export type PayLink = {
  id: string; asset: Asset; amount: number | null; memo: string; created: number
  recurring: boolean; receipts: { amount: number; time: number }[]; active: boolean
  /** Set for live links: the Solana owner whose private balance receives payments. */
  owner?: string
}
export type Order = {
  id: string; side: 'buy' | 'sell'; base: Asset; quote: Asset; amount: number; limit: number
  kind: 'limit' | 'dca'; slices: number; filled: number; status: 'open' | 'filled' | 'cancelled'; created: number; commitment: string
}
export type Launch = { id: string; name: string; symbol: string; supply: number; sold: number; raised: number; created: number; mine: boolean; mint: string }
export type StealthReceipt = { addr: string; amount: number; asset: Asset; time: number; swept: boolean; viewTag: string }
export type StealthKeys = { meta: string; spendPub: string; viewPub: string; received: StealthReceipt[] }
export type ComplianceProof = { id: string; set: string; root: string; notes: number; created: number; expires: number }
export type ViewKey = { id: string; label: string; key: string; scope: 'all' | 'year'; created: number; revoked: boolean }
export type Block = { height: number; hash: string; txs: ChainTx[]; time: number; receipt?: string }
export type ChainTx = { id: string; kind: string; nullifiers: number; commitments: number; mine?: boolean }

type Persisted = {
  connected: boolean; address: string; pub: Record<Asset, number>; notes: Note[]; activity: Activity[]
  links: PayLink[]; orders: Order[]; launches: Launch[]; stealth: StealthKeys | null
  proofs: ComplianceProof[]; viewKeys: ViewKey[]
}

const BASE_PRICES: Record<Asset, number> = { SOL: 182.4, USDC: 1, JUP: 0.94, BONK: 0.000021 }
export const CORE_ASSETS = ['SOL', 'USDC', 'JUP', 'BONK']
export const ASSOCIATION_SETS = [
  { id: 'haus-clean', label: 'Haus Clean Set', desc: 'Deposits not linked to any sanctioned or hacked address. Curated by the pullhaus association committee.', size: 18342 },
  { id: 'kyc-verified', label: 'Verified Depositors', desc: 'Deposits from wallets that passed a third-party identity check.', size: 6120 },
  { id: 'exchange-origin', label: 'Exchange Origin', desc: 'Deposits that came straight from a major exchange withdrawal.', size: 9877 },
]
export const RELAYER_FEE = 0.0025 // 0.25%
export const SWAP_FEE = 0.003

const KEY = 'pullhaus.demo.v1'
const fresh = (): Persisted => ({
  connected: false, address: '', pub: { SOL: 42.5, USDC: 2500, JUP: 800, BONK: 25_000_000 }, notes: [], activity: [],
  links: [], orders: [], launches: [], stealth: null, proofs: [], viewKeys: [],
})

const commitment = () => '0x' + hex(64)
const sig = () => b58(87)
const randTx = (): ChainTx => {
  const kinds = ['transact', 'transact', 'transact', 'deposit', 'withdraw', 'register']
  return { id: b58(44), kind: kinds[Math.floor(Math.random() * kinds.length)], nullifiers: Math.random() > 0.3 ? 2 : 0, commitments: 2 }
}

function seedChain(): Block[] {
  const now = Date.now()
  const start = 18_204
  return Array.from({ length: 24 }, (_, i) => {
    const height = start + i
    return {
      height, hash: hex(64), time: now - (24 - i) * 2400,
      txs: Array.from({ length: Math.floor(Math.random() * 6) }, randTx),
      receipt: height % 8 === 0 ? b58(88) : undefined,
    }
  })
}

function spend(notes: Note[], asset: Asset, amount: number): { notes: Note[]; inputs: number } {
  const avail = notes.filter((n) => !n.spent && n.asset === asset).sort((a, b) => b.amount - a.amount)
  const total = avail.reduce((s, n) => s + n.amount, 0)
  if (amount <= 0) throw new Error('Enter an amount above zero.')
  if (total + 1e-12 < amount) throw new Error(`Not enough shielded ${asset}. You have ${total} in the vault.`)
  let need = amount
  const used = new Set<string>()
  for (const n of avail) {
    if (need <= 1e-12) break
    used.add(n.id)
    need -= n.amount
  }
  const change = -need
  const next = notes.map((n) => (used.has(n.id) ? { ...n, spent: true } : n))
  if (change > 1e-9) next.push({ id: rid(), asset, amount: change, spent: false, created: Date.now(), commitment: commitment() })
  return { notes: next, inputs: used.size }
}

export function launchPrice(l: Pick<Launch, 'sold' | 'supply'>) {
  // linear bonding curve in SOL: starts at 0.00000002, ends 40x higher when the curve sells out
  const p0 = 0.00000002
  return p0 * (1 + 39 * (l.sold / l.supply))
}

type Store = Persisted & {
  prices: Record<Asset, number>
  blocks: Block[]
  shielded: Record<Asset, number>
  assets: Asset[]
  connect(): void
  disconnect(): void
  reset(): void
  shield(asset: Asset, amount: number): void
  unshield(asset: Asset, amount: number, to: string): void
  send(asset: Asset, amount: number, to: string): void
  swap(from: Asset, to: Asset, amount: number): number
  createLaunch(name: string, symbol: string, supply: number, devBuySol: number): Launch
  buyLaunch(id: string, sol: number): number
  createLink(asset: Asset, amount: number | null, memo: string, recurring: boolean, owner?: string): PayLink
  toggleLink(id: string): void
  payLink(id: string, amount: number): void
  placeOrder(o: Omit<Order, 'id' | 'filled' | 'status' | 'created' | 'commitment'>): void
  cancelOrder(id: string): void
  genStealth(): void
  simulateIncoming(): void
  sweep(addr: string): void
  makeProof(setId: string): ComplianceProof
  createViewKey(label: string, scope: ViewKey['scope']): ViewKey
  revokeViewKey(id: string): void
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Persisted>(() => ({ ...fresh(), ...load<Partial<Persisted>>(KEY, {}) }))
  const [prices, setPrices] = useState<Record<Asset, number>>(BASE_PRICES)
  const [blocks, setBlocks] = useState<Block[]>(seedChain)
  // keyed by detail so React StrictMode's double-invoked updaters don't log a tx twice
  const pending = useRef<Map<string, ChainTx>>(new Map())

  useEffect(() => save(KEY, s), [s])

  const log = (p: Persisted, kind: string, detail: string, nullifiers = 2): Persisted => {
    const signature = sig()
    pending.current.set(kind + detail, { id: signature.slice(0, 44), kind, nullifiers, commitments: 2, mine: true })
    return { ...p, activity: [{ id: rid(), kind, detail, time: Date.now(), sig: signature }, ...p.activity].slice(0, 200) }
  }

  // Simulated feed for demo mode only; live data comes from Privacy Rings on Solana.
  useEffect(() => {
    const t = setInterval(() => {
      setBlocks((bs) => {
        const last = bs[bs.length - 1]
        const height = last.height + 1
        const mine = [...pending.current.values()]
        pending.current.clear()
        const txs = [...mine, ...Array.from({ length: Math.floor(Math.random() * 6) }, randTx)]
        const b: Block = { height, hash: hex(64), time: Date.now(), txs, receipt: height % 8 === 0 ? b58(88) : undefined }
        return [...bs.slice(-199), b]
      })
    }, 2400)
    return () => clearInterval(t)
  }, [])

  // Price drift + order keeper.
  useEffect(() => {
    const t = setInterval(() => {
      setPrices((p) => {
        const n = { ...p }
        for (const k of ['SOL', 'JUP', 'BONK']) n[k] = p[k] * (1 + (Math.random() - 0.5) * 0.008)
        return n
      })
    }, 3000)
    return () => clearInterval(t)
  }, [])

  const allPrices = useMemo(() => {
    const out = { ...prices }
    for (const l of s.launches) out[l.symbol] = launchPrice(l) * prices.SOL
    return out
  }, [prices, s.launches])

  // Keeper: fill open orders whose limit has been crossed (DCA fills one slice per tick).
  useEffect(() => {
    setS((p) => {
      let changed = false
      let next = p
      const orders = p.orders.map((o) => {
        if (o.status !== 'open') return o
        const px = allPrices[o.base] / allPrices[o.quote]
        const hit = o.kind === 'dca' || (o.side === 'buy' ? px <= o.limit : px >= o.limit)
        if (!hit || (o.kind === 'dca' && Math.random() > 0.35)) return o
        changed = true
        const slice = o.kind === 'dca' ? o.amount / o.slices : o.amount - o.filled
        const filled = o.filled + slice
        // escrowed input already left the vault at placement; credit output as a fresh note
        const outAsset = o.side === 'buy' ? o.base : o.quote
        const outAmt = o.side === 'buy' ? (slice * allPrices[o.quote]) / allPrices[o.base] : (slice * allPrices[o.base]) / allPrices[o.quote]
        next = {
          ...next,
          notes: [...next.notes, { id: rid(), asset: outAsset, amount: outAmt * (1 - SWAP_FEE), spent: false, created: Date.now(), commitment: commitment() }],
        }
        next = log(next, 'order', `${o.kind === 'dca' ? 'DCA slice' : 'Limit'} ${o.side} filled: ${slice.toPrecision(4)} → ${outAmt.toPrecision(4)} ${outAsset}`)
        return { ...o, filled, status: filled >= o.amount - 1e-9 ? ('filled' as const) : o.status }
      })
      return changed ? { ...next, orders } : p
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prices])

  const shielded = useMemo(() => {
    const out: Record<Asset, number> = {}
    for (const n of s.notes) if (!n.spent) out[n.asset] = (out[n.asset] ?? 0) + n.amount
    return out
  }, [s.notes])

  const assets = useMemo(() => [...CORE_ASSETS, ...s.launches.map((l) => l.symbol)], [s.launches])

  const mut = useCallback((f: (p: Persisted) => Persisted) => setS(f), [])

  // Runs against the current snapshot so validation errors throw to the caller (and show in the UI).
  // The real update is functional so several actions in one tick (batch payroll) chain correctly.
  const apply = (f: (p: Persisted) => Persisted) => {
    f(s)
    setS((p) => f(p))
  }

  const store: Store = {
    ...s, prices: allPrices, blocks, shielded, assets,
    connect: () => mut((p) => ({ ...p, connected: true, address: p.address || b58(44) })),
    disconnect: () => mut((p) => ({ ...p, connected: false })),
    reset: () => mut(() => fresh()),

    // programs/pullhaus: transact (public_amount > 0, one output note to self)
    shield: (asset, amount) => apply((p) => {
      if (!(amount > 0)) throw new Error('Enter an amount above zero.')
      if ((p.pub[asset] ?? 0) < amount) throw new Error(`Your wallet only has ${p.pub[asset] ?? 0} ${asset}.`)
      const n: Note = { id: rid(), asset, amount, spent: false, created: Date.now(), commitment: commitment() }
      return log({ ...p, pub: { ...p.pub, [asset]: p.pub[asset] - amount }, notes: [...p.notes, n] }, 'shield', `Shielded ${amount} ${asset}`, 0)
    }),

    // transact (public_amount < 0, recipient = external address, relayer pays gas)
    unshield: (asset, amount, to) => apply((p) => {
      if (!to.trim()) throw new Error('Add a destination address.')
      const r = spend(p.notes, asset, amount)
      const isMine = to === p.address
      const got = amount * (1 - RELAYER_FEE)
      return log({ ...p, notes: r.notes, pub: isMine ? { ...p.pub, [asset]: (p.pub[asset] ?? 0) + got } : p.pub }, 'unshield', `Withdrew ${got.toPrecision(6)} ${asset} to ${to.slice(0, 6)}…`)
    }),

    // transact (public_amount = 0, output note encrypted to recipient's shielded key or stealth meta-address)
    send: (asset, amount, to) => apply((p) => {
      if (!to.trim()) throw new Error('Add a recipient: a pullhaus address (ph1…) or stealth meta-address (st:ph…).')
      const r = spend(p.notes, asset, amount)
      return log({ ...p, notes: r.notes }, 'send', `Sent ${amount} ${asset} privately to ${to.slice(0, 10)}…`)
    }),

    // transact → swap adapter → transact (all inside one relayed bundle)
    swap: (from, to, amount) => {
      if (from === to) throw new Error('Pick two different assets.')
      const out = ((amount * allPrices[from]) / allPrices[to]) * (1 - SWAP_FEE)
      apply((p) => {
        const r = spend(p.notes, from, amount)
        const n: Note = { id: rid(), asset: to, amount: out, spent: false, created: Date.now(), commitment: commitment() }
        return log({ ...p, notes: [...r.notes, n] }, 'swap', `Swapped ${amount} ${from} → ${out.toPrecision(6)} ${to}`)
      })
      return out
    },

    // create_launch + buy via shielded SOL (buyer identity never touches the curve)
    createLaunch: (name, symbol, supply, devBuySol) => {
      const sym = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
      if (!name.trim() || !sym) throw new Error('Give the coin a name and ticker.')
      if (supply < 1000) throw new Error('Supply must be at least 1,000.')
      if (s.launches.some((l) => l.symbol === sym) || CORE_ASSETS.includes(sym)) throw new Error(`${sym} already exists.`)
      const l: Launch = { id: rid(), name: name.trim(), symbol: sym, supply, sold: 0, raised: 0, created: Date.now(), mine: true, mint: b58(44) }
      apply((p) => {
        let next: Persisted = { ...p, launches: [l, ...p.launches] }
        if (devBuySol > 0) {
          const r = spend(next.notes, 'SOL', devBuySol)
          const tokens = Math.min(supply * 0.2, devBuySol / launchPrice(l))
          next.launches = next.launches.map((x) => (x.id === l.id ? { ...x, sold: tokens, raised: devBuySol } : x))
          next = { ...next, notes: [...r.notes, { id: rid(), asset: sym, amount: tokens, spent: false, created: Date.now(), commitment: commitment() }] }
        }
        return log(next, 'launch', `Forged ${l.name} ($${sym}), supply ${supply.toLocaleString()}`)
      })
      return l
    },

    buyLaunch: (id, sol) => {
      const l = s.launches.find((x) => x.id === id)
      if (!l) throw new Error('Launch not found.')
      const tokens = Math.min(l.supply - l.sold, sol / launchPrice(l))
      if (tokens <= 0) throw new Error('This curve is sold out.')
      apply((p) => {
        const r = spend(p.notes, 'SOL', sol)
        return log({
          ...p, notes: [...r.notes, { id: rid(), asset: l.symbol, amount: tokens, spent: false, created: Date.now(), commitment: commitment() }],
          launches: p.launches.map((x) => (x.id === id ? { ...x, sold: x.sold + tokens, raised: x.raised + sol } : x)),
        }, 'buy', `Bought ${tokens.toFixed(0)} $${l.symbol} from the curve`)
      })
      return tokens
    },

    // create_link: stores the owner's encryption key + terms; payers deposit with an output note encrypted to it
    createLink: (asset, amount, memo, recurring, owner) => {
      const l: PayLink = { id: b58(10), asset, amount, memo: memo.trim(), created: Date.now(), recurring, receipts: [], active: true, owner }
      mut((p) => log({ ...p, links: [l, ...p.links] }, 'link', `Created payment link for ${amount ?? 'any amount of'} ${asset}`, 0))
      return l
    },
    toggleLink: (id) => mut((p) => ({ ...p, links: p.links.map((l) => (l.id === id ? { ...l, active: !l.active } : l)) })),
    payLink: (id, amount) => apply((p) => {
      const l = p.links.find((x) => x.id === id)
      if (!l || !l.active) throw new Error('This link is closed.')
      if (!(amount > 0)) throw new Error('Enter an amount above zero.')
      const n: Note = { id: rid(), asset: l.asset, amount, spent: false, created: Date.now(), commitment: commitment() }
      return log({
        ...p, notes: [...p.notes, n],
        links: p.links.map((x) => (x.id === id ? { ...x, receipts: [{ amount, time: Date.now() }, ...x.receipts], active: x.recurring || x.amount === null } : x)),
      }, 'link-paid', `Received ${amount} ${l.asset} via link ${l.id}`, 0)
    }),

    // place_order: input moves from the vault into an escrow PDA keyed by a hidden order commitment
    placeOrder: (o) => apply((p) => {
      if (!(o.limit > 0) && o.kind === 'limit') throw new Error('Set a limit price.')
      if (o.base === o.quote) throw new Error('Pick two different assets.')
      const inAsset = o.side === 'buy' ? o.quote : o.base
      const r = spend(p.notes, inAsset, o.amount)
      const order: Order = { ...o, id: rid(), filled: 0, status: 'open', created: Date.now(), commitment: commitment() }
      return log({ ...p, notes: r.notes, orders: [order, ...p.orders] }, 'order', `Placed hidden ${o.kind} ${o.side} for ${o.amount} ${inAsset}`)
    }),
    cancelOrder: (id) => mut((p) => {
      const o = p.orders.find((x) => x.id === id)
      if (!o || o.status !== 'open') return p
      const inAsset = o.side === 'buy' ? o.quote : o.base
      const left = o.amount - o.filled
      return log({
        ...p, orders: p.orders.map((x) => (x.id === id ? { ...x, status: 'cancelled' as const } : x)),
        notes: left > 0 ? [...p.notes, { id: rid(), asset: inAsset, amount: left, spent: false, created: Date.now(), commitment: commitment() }] : p.notes,
      }, 'order', `Cancelled order, ${left.toPrecision(4)} ${inAsset} back in the vault`)
    }),

    // Stealth: meta-address = (spend pubkey, view pubkey); senders call `announce` with ephemeral key + view tag
    genStealth: () => mut((p) => ({ ...p, stealth: { meta: 'st:ph' + b58(66), spendPub: b58(44), viewPub: b58(44), received: p.stealth?.received ?? [] } })),
    simulateIncoming: () => mut((p) => {
      if (!p.stealth) return p
      const asset = Math.random() > 0.5 ? 'SOL' : 'USDC'
      const amount = asset === 'SOL' ? +(Math.random() * 3 + 0.1).toFixed(3) : +(Math.random() * 400 + 20).toFixed(2)
      const rec: StealthReceipt = { addr: b58(44), amount, asset, time: Date.now(), swept: false, viewTag: hex(2) }
      return { ...p, stealth: { ...p.stealth, received: [rec, ...p.stealth.received] } }
    }),
    sweep: (addr) => mut((p) => {
      if (!p.stealth) return p
      const rec = p.stealth.received.find((r) => r.addr === addr)
      if (!rec || rec.swept) return p
      return log({
        ...p, notes: [...p.notes, { id: rid(), asset: rec.asset, amount: rec.amount, spent: false, created: Date.now(), commitment: commitment() }],
        stealth: { ...p.stealth, received: p.stealth.received.map((r) => (r.addr === addr ? { ...r, swept: true } : r)) },
      }, 'sweep', `Swept ${rec.amount} ${rec.asset} from stealth address into the vault`, 0)
    }),

    // attest: ZK proof that every unspent note descends from deposits in the chosen association set
    makeProof: (setId) => {
      const live = s.notes.filter((n) => !n.spent)
      if (!live.length) throw new Error('Shield something first. There are no notes to prove.')
      const set = ASSOCIATION_SETS.find((x) => x.id === setId)!
      const proof: ComplianceProof = { id: rid(), set: set.label, root: '0x' + hex(64), notes: live.length, created: Date.now(), expires: Date.now() + 30 * 86400_000 }
      mut((p) => log({ ...p, proofs: [proof, ...p.proofs] }, 'attest', `Proved ${live.length} notes ⊂ ${set.label}`, 0))
      return proof
    },
    createViewKey: (label, scope) => {
      const k: ViewKey = { id: rid(), label: label.trim() || 'Untitled', key: 'phvk_' + b58(56), scope, created: Date.now(), revoked: false }
      mut((p) => ({ ...p, viewKeys: [k, ...p.viewKeys] }))
      return k
    },
    revokeViewKey: (id) => mut((p) => ({ ...p, viewKeys: p.viewKeys.map((k) => (k.id === id ? { ...k, revoked: true } : k)) })),
  }

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore outside provider')
  return v
}
