/**
 * pullhaus end-to-end test on Solana DEVNET (free test SOL, no real money).
 *
 * Exercises the same Helius Privacy Rings code paths as the live site
 * (web/src/lib/rings.ts): wallet-signature key derivation, registration,
 * deposit, encrypted-balance sync, private transfer, multi-transfer (payroll)
 * and withdrawal. Two throwaway test wallets are generated per run.
 *
 *   HELIUS_API_KEY=... node scripts/devnet-e2e.mjs
 */
import {
  buildDepositTransaction, buildMultiTransferTransaction, buildRegistrationTransaction,
  buildTransferTransaction, buildWithdrawalTransaction, createSprClient, formatAmount,
  getPrivateTokenBalances, LocalKeys, SOL_MINT, syncWallet, Wallet,
} from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
import { ed25519DerivationMessage } from '@heliuslabs/spr/keypair'
import { isWalletRegistered } from '@heliuslabs/spr/wallet'
import {
  appendTransactionMessageInstruction, createKeyPairFromPrivateKeyBytes, createSignerFromKeyPair,
  createTransactionMessage, generateKeyPair, getAddressEncoder, getAddressFromPublicKey,
  getBase64EncodedWireTransaction, partiallySignTransaction, pipe, setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash, signBytes, signTransactionMessageWithSigners,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { randomBytes } from 'node:crypto'
import fs from 'node:fs'

const KEY = process.env.HELIUS_API_KEY
if (!KEY) throw new Error('Set HELIUS_API_KEY')
const RPC = `https://devnet.helius-rpc.com/?api-key=${KEY}`
const LAMPORTS = 1_000_000_000n
const sol = (n) => BigInt(Math.round(n * 1e9))
const fmt = (l) => formatAmount(l, 9)
const results = []
const step = async (name, fn) => {
  const t = Date.now()
  try {
    const detail = await fn()
    results.push({ step: name, ok: true, ms: Date.now() - t, detail })
    console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}  (${((Date.now() - t) / 1000).toFixed(1)}s)`)
  } catch (e) {
    results.push({ step: name, ok: false, ms: Date.now() - t, detail: e?.message ?? String(e) })
    console.log(`  ✗ ${name} — ${e?.message ?? e}`)
    if (e?.cause) console.log('    cause:', e.cause?.message ?? e.cause)
    throw e
  }
}

/** Wallet A persists across runs (seed file outside the repo) so it can be funded once from faucet.solana.com. */
async function persistentKeyPair(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, randomBytes(32).toString('hex'), { mode: 0o600 })
  return createKeyPairFromPrivateKeyBytes(Buffer.from(fs.readFileSync(file, 'utf8').trim(), 'hex'))
}

async function makeWallet(client, label, existing) {
  const kp = existing ?? await generateKeyPair()
  const owner = await getAddressFromPublicKey(kp.publicKey)
  const pub = getAddressEncoder().encode(owner)
  // Same as the browser: the wallet signs the derivation message, the signature seeds the keys.
  const seed = await signBytes(kp.privateKey, ed25519DerivationMessage(new Uint8Array(pub)))
  const keys = LocalKeys.fromDerivationSeed({ solanaPublicKey: owner, derivationSeed: seed }, client.proofService)
  const wallet = new Wallet({ identity: keys.address() })
  return { label, kp, owner, keys, wallet }
}

async function send(client, w, tx, privateTx) {
  const signed = await partiallySignTransaction([w.kp], tx)
  const sig = await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' }).send()
  if (privateTx) await client.confirmPrivateTransaction(sig)
  else await client.confirmTransaction(sig)
  return sig
}

async function privateBal(client, w) {
  await syncWallet({ wallet: w.wallet, keys: w.keys, client })
  const b = getPrivateTokenBalances(w.wallet).find((x) => x.mint === SOL_MINT)
  return b?.amount ?? 0n
}

const publicBal = async (client, a) => (await client.solanaRpc.getBalance(a).send()).value

async function fundFrom(client, from, to, amount) {
  const signer = await createSignerFromKeyPair(from.kp)
  const { value: bh } = await client.solanaRpc.getLatestBlockhash().send()
  const msg = pipe(createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m),
    (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: signer, destination: to, amount }), m))
  const signed = await signTransactionMessageWithSigners(msg)
  const sig = await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' }).send()
  await client.confirmTransaction(sig)
  return `${fmt(amount)} SOL from A`
}

console.log('\npullhaus devnet end-to-end test\n')
const client = await createSprClient({ solanaRpcUrl: RPC, proverTee: SignedTeePolicy.forNetwork('devnet') })
const SEED_FILE = process.env.TEST_WALLET_FILE
if (!SEED_FILE) throw new Error('Set TEST_WALLET_FILE (a path outside the repo for the test wallet seed)')
const A = await makeWallet(client, 'A', await persistentKeyPair(SEED_FILE))
const B = await makeWallet(client, 'B')
const C = await makeWallet(client, 'C')
console.log(`  wallets  A=${A.owner}\n           B=${B.owner}\n           C=${C.owner}\n`)

const startBal = await publicBal(client, A.owner)
if (startBal < sol(0.6)) {
  console.log(`  Wallet A has ${fmt(startBal)} devnet SOL; it needs at least 0.6.`)
  console.log(`  Fund it (free test SOL) at https://faucet.solana.com → Devnet → ${A.owner}\n`)
  process.exit(2)
}
console.log(`  A starts with ${fmt(startBal)} devnet SOL\n`)

try {
  await step('fund B from A (for fees)', () => fundFrom(client, A, B.owner, sol(0.1)))

  for (const w of [A, B, C]) {
    await step(`register ${w.label} on Privacy Rings`, async () => {
      if (w.label === 'C') {
        // C has no SOL: A pays C's registration, like a sponsor would.
        const tx = await buildRegistrationTransaction({ client, owner: w.owner, address: w.keys.address(), payer: A.owner })
        if (!tx) return 'already registered'
        const signed = await partiallySignTransaction([A.kp, w.kp], tx)
        const sig = await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' }).send()
        await client.confirmTransaction(sig)
      } else {
        const tx = await buildRegistrationTransaction({ client, owner: w.owner, address: w.keys.address() })
        if (tx) await send(client, w, tx, false)
      }
      const ok = await isWalletRegistered({ rpc: client, owner: w.owner })
      if (!ok) throw new Error('registry does not show the wallet')
      return 'registered'
    })
  }

  let a0 = 0n
  await step('read A starting private balance', async () => { a0 = await privateBal(client, A); return `${fmt(a0)} SOL left over from earlier runs` })

  await step('A deposits 0.3 SOL (public → private)', async () => {
    const tx = await buildDepositTransaction({ client, feePayer: A.owner, asset: SOL_MINT, amount: sol(0.3), recipient: A.keys.address() })
    const sig = await send(client, A, tx, true)
    return `sig ${sig.slice(0, 10)}…`
  })

  await step('A private balance shows 0.3 SOL', async () => {
    const b = await privateBal(client, A)
    if (b - a0 !== sol(0.3)) throw new Error(`expected +0.3, got +${fmt(b - a0)}`)
    return `${fmt(b)} SOL private (+0.3)`
  })

  const base = (w) => ({ client, wallet: w.wallet, keys: w.keys, feePayer: w.owner })

  await step('A sends 0.1 SOL privately to B', async () => {
    const tx = await buildTransferTransaction({ ...base(A), recipient: B.owner, asset: SOL_MINT, amount: sol(0.1) })
    const sig = await send(client, A, tx, true)
    return `sig ${sig.slice(0, 10)}…`
  })

  await step('balances: A +0.2, B 0.1 (decrypted locally)', async () => {
    const a = await privateBal(client, A), b = await privateBal(client, B)
    if (a - a0 !== sol(0.2) || b !== sol(0.1)) throw new Error(`A=+${fmt(a - a0)} B=${fmt(b)}`)
    return `A ${fmt(a)} · B ${fmt(b)}`
  })

  await step('payroll: A pays B 0.03 + C 0.02 in one tx', async () => {
    const tx = await buildMultiTransferTransaction({ ...base(A), asset: SOL_MINT, payments: [
      { recipient: B.owner, amount: sol(0.03) }, { recipient: C.owner, amount: sol(0.02) },
    ] })
    const sig = await send(client, A, tx, true)
    return `sig ${sig.slice(0, 10)}…`
  })

  await step('balances after payroll: A +0.15, B 0.13, C 0.02', async () => {
    const a = await privateBal(client, A), b = await privateBal(client, B), c = await privateBal(client, C)
    if (a - a0 !== sol(0.15) || b !== sol(0.13) || c !== sol(0.02)) throw new Error(`A=+${fmt(a - a0)} B=${fmt(b)} C=${fmt(c)}`)
    return `A ${fmt(a)} · B ${fmt(b)} · C ${fmt(c)}`
  })

  await step('B withdraws 0.05 SOL to its public address', async () => {
    const before = await publicBal(client, B.owner)
    const tx = await buildWithdrawalTransaction({ ...base(B), recipient: B.owner, asset: SOL_MINT, amount: sol(0.05) })
    await send(client, B, tx, true)
    const after = await publicBal(client, B.owner)
    const net = after - before
    if (net <= sol(0.04)) throw new Error(`public balance only moved by ${fmt(net)}`)
    return `public +${fmt(net)} SOL (0.05 minus network fee)`
  })

  await step('B private balance now 0.08', async () => {
    const b = await privateBal(client, B)
    if (b !== sol(0.08)) throw new Error(`expected 0.08, got ${fmt(b)}`)
    return `${fmt(b)} SOL private`
  })
} catch {
  /* reported below */
} finally {
  const pass = results.filter((r) => r.ok).length
  console.log(`\n  ${pass}/${results.length} steps passed\n`)
  process.exitCode = results.every((r) => r.ok) ? 0 : 1
}
