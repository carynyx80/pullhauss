/**
 * Devnet end-to-end test of the PLAIN-TEXT sign-in (Phantom-compatible).
 *
 * The wallet signs a normal UTF-8 message (64-byte Ed25519 signature). The
 * nullifier and viewing keys are expanded from that signature exactly like the
 * SDK's own derivation (HKDF-SHA256, same labels); the signing key stays the
 * wallet's own key, which is what the Privacy Rings registry requires. Spends
 * are then signed by the wallet alone, like any transaction.
 *
 *   HELIUS_API_KEY=... TEST_WALLET_FILE=... node scripts/devnet-e2e-plaintext.mjs
 */
import {
  buildDepositTransaction, buildMultiTransferTransaction, buildRegistrationTransaction, buildTransferTransaction,
  buildWithdrawalTransaction, createSprClient, formatAmount, getPrivateTokenBalances, LocalKeys, NullifierKey,
  ShieldedAddress, ShieldedPublicKey, SOL_MINT, syncWallet, ViewingKey, Wallet,
} from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
import { isWalletRegistered, resolveRegisteredAddress } from '@heliuslabs/spr/wallet'
import {
  appendTransactionMessageInstruction, createKeyPairFromPrivateKeyBytes, createSignerFromKeyPair, createTransactionMessage,
  generateKeyPair, getAddressEncoder, getAddressFromPublicKey, getBase64EncodedWireTransaction, partiallySignTransaction, pipe,
  setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signBytes, signTransactionMessageWithSigners,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import fs from 'node:fs'

const RPC = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
const sol = (n) => BigInt(Math.round(n * 1e9))
const fmt = (l) => formatAmount(l, 9)
const results = []
const step = async (name, fn) => {
  const t = Date.now()
  try { const d = await fn(); results.push(true); console.log(`  ✓ ${name}${d ? ` — ${d}` : ''}  (${((Date.now() - t) / 1000).toFixed(1)}s)`) }
  catch (e) { results.push(false); let c = e, chain = []; while (c) { chain.push(c.code ?? c.message); c = c.cause }; console.log(`  ✗ ${name} — ${chain.join(' ← ')}`); throw e }
}

/** The human-readable message the wallet signs (same text as the site). */
const signInMessage = (owner) =>
  `Sign in to pullhaus\n\nThis unlocks your private balance on Helius Privacy Rings. It is free and does not send a transaction.\n\nOnly sign this on www.pullhaus.xyz.\n\nWallet: ${owner}\nVersion: 1`

const enc = new TextEncoder()
async function hkdf(ikm, info, bits) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(), info: enc.encode(info) }, key, bits))
}
/** Mirrors the SDK's roleExpansion, seeded by a plain-text signature; signing key = wallet. */
async function keysFromSignature(walletPub, sig, proofs) {
  const nf = await hkdf(sig, 'TSPP/nf_key/ed25519/v1', 248)
  const vk = await hkdf(sig, 'TSPP/view_key/ed25519/x25519/v1', 256)
  vk[0] &= 248; vk[31] = (vk[31] & 127) | 64
  const viewing = ViewingKey.fromBytes(vk), nullifier = NullifierKey.fromSecret(nf)
  const address = ShieldedAddress.fromPublicKeys(ShieldedPublicKey.fromEd25519(walletPub), nullifier.publicKey(), viewing.publicKey())
  return LocalKeys.fromKeys({ address, viewingKeys: [viewing], nullifierKey: nullifier }, proofs)
}

async function makeUser(client, label, kp) {
  kp = kp ?? await generateKeyPair()
  const owner = await getAddressFromPublicKey(kp.publicKey)
  const sig = await signBytes(kp.privateKey, enc.encode(signInMessage(owner)))
  const keys = await keysFromSignature(new Uint8Array(getAddressEncoder().encode(owner)), sig, client.proofService)
  return { label, kp, owner, keys, wallet: new Wallet({ identity: keys.address() }) }
}
async function send(client, u, tx, privateTx = true) {
  const signed = await partiallySignTransaction([u.kp], tx)
  const sig = await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(signed), { encoding: 'base64' }).send()
  if (privateTx) await client.confirmPrivateTransaction(sig); else await client.confirmTransaction(sig)
  return sig
}
async function fund(client, from, to, amount) {
  const signer = await createSignerFromKeyPair(from)
  const { value: bh } = await client.solanaRpc.getLatestBlockhash().send()
  const msg = pipe(createTransactionMessage({ version: 0 }), (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m), (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: signer, destination: to, amount }), m))
  await client.confirmTransaction(await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(await signTransactionMessageWithSigners(msg)), { encoding: 'base64' }).send())
}
const privateBal = async (client, u, expect) => {
  for (let i = 0; i < 10; i++) {
    await syncWallet({ wallet: u.wallet, keys: u.keys, client })
    const b = getPrivateTokenBalances(u.wallet).find((x) => x.mint === SOL_MINT)?.amount ?? 0n
    if (expect === undefined || b === expect) return b
    await new Promise((r) => setTimeout(r, 2000))
  }
  return getPrivateTokenBalances(u.wallet).find((x) => x.mint === SOL_MINT)?.amount ?? 0n
}

console.log('\npullhaus devnet test — plain-text sign-in (Phantom-compatible)\n')
const client = await createSprClient({ solanaRpcUrl: RPC, proverTee: SignedTeePolicy.forNetwork('devnet') })
const funder = await createKeyPairFromPrivateKeyBytes(Buffer.from(fs.readFileSync(process.env.TEST_WALLET_FILE, 'utf8').trim(), 'hex'))
const D = await makeUser(client, 'D'), E = await makeUser(client, 'E')
const base = (u) => ({ client, wallet: u.wallet, keys: u.keys, feePayer: u.owner })
console.log(`  D=${D.owner}\n  E=${E.owner}\n`)

try {
  await step('fund D (0.15) and E (0.02) with public devnet SOL', async () => { await fund(client, funder, D.owner, sol(0.15)); await fund(client, funder, E.owner, sol(0.02)) })
  await step('sign-in is deterministic (re-sign → same private address)', async () => {
    const again = await makeUser(client, 'D2', D.kp)
    if (Buffer.from(again.keys.address().toBytes()).compare(Buffer.from(D.keys.address().toBytes())) !== 0) throw new Error('differs')
    return 'identical'
  })
  for (const u of [D, E]) {
    await step(`register ${u.label}`, async () => {
      const tx = await buildRegistrationTransaction({ client, owner: u.owner, address: u.keys.address() })
      if (tx) await send(client, u, tx, false)
      if (!(await isWalletRegistered({ rpc: client, owner: u.owner }))) throw new Error('not registered')
      const r = await resolveRegisteredAddress({ rpc: client, owner: u.owner })
      if (Buffer.from(r.address.toBytes()).compare(Buffer.from(u.keys.address().toBytes())) !== 0) throw new Error('registry address ≠ our keys')
      return 'registry matches our keys'
    })
  }
  await step('D deposits 0.05 SOL', async () => 'sig ' + (await send(client, D, await buildDepositTransaction({ client, feePayer: D.owner, asset: SOL_MINT, amount: sol(0.05), recipient: D.keys.address() }))).slice(0, 10) + '…')
  await step('D private balance = 0.05', async () => { const b = await privateBal(client, D, sol(0.05)); if (b !== sol(0.05)) throw new Error(fmt(b)); return fmt(b) })
  await step('D sends 0.01 privately to E (by wallet address)', async () => 'sig ' + (await send(client, D, await buildTransferTransaction({ ...base(D), recipient: E.owner, asset: SOL_MINT, amount: sol(0.01) }))).slice(0, 10) + '…')
  await step('balances D 0.04 · E 0.01', async () => {
    const d = await privateBal(client, D, sol(0.04)), e = await privateBal(client, E, sol(0.01))
    if (d !== sol(0.04) || e !== sol(0.01)) throw new Error(`D=${fmt(d)} E=${fmt(e)}`)
    return `D ${fmt(d)} · E ${fmt(e)}`
  })
  await step('payroll: D pays E 0.002 + funder 0.001 in one tx', async () => 'sig ' + (await send(client, D, await buildMultiTransferTransaction({ ...base(D), asset: SOL_MINT, payments: [{ recipient: E.owner, amount: sol(0.002) }, { recipient: await getAddressFromPublicKey(funder.publicKey), amount: sol(0.001) }] }))).slice(0, 10) + '…')
  await step('E withdraws 0.005 to its public wallet', async () => {
    const before = (await client.solanaRpc.getBalance(E.owner).send()).value
    await send(client, E, await buildWithdrawalTransaction({ ...base(E), recipient: E.owner, asset: SOL_MINT, amount: sol(0.005) }))
    const after = (await client.solanaRpc.getBalance(E.owner).send()).value
    if (after - before < sol(0.004)) throw new Error(`moved ${fmt(after - before)}`)
    return `public +${fmt(after - before)}`
  })
  await step('final: D 0.037 · E 0.007', async () => {
    const d = await privateBal(client, D, sol(0.037)), e = await privateBal(client, E, sol(0.007))
    if (d !== sol(0.037) || e !== sol(0.007)) throw new Error(`D=${fmt(d)} E=${fmt(e)}`)
    return `D ${fmt(d)} · E ${fmt(e)}`
  })
} catch { /* reported */ } finally {
  console.log(`\n  ${results.filter(Boolean).length}/${results.length} steps passed\n`)
}
