import { buildDepositTransaction, buildTransferTransaction, createSprClient, LocalKeys, ShieldedKeypair, SigningKey, SOL_MINT, syncWallet, getPrivateTokenBalances, Wallet } from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
import { resolveRegisteredAddress, buildRegistrationTransaction } from '@heliuslabs/spr/wallet'
import { createKeyPairFromPrivateKeyBytes, generateKeyPair, getAddressFromPublicKey, getBase64EncodedWireTransaction, partiallySignTransaction, signBytes, appendTransactionMessageInstruction, createSignerFromKeyPair, createTransactionMessage, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners } from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
const hex = (b) => Buffer.from(b instanceof Uint8Array ? b : (b?.toBytes?.() ?? b)).toString('hex')
const J = (o) => JSON.stringify(o, (_k, v) => typeof v === 'bigint' ? v.toString() : v instanceof Uint8Array ? hex(v) : v)
const client = await createSprClient({ solanaRpcUrl: `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, proverTee: SignedTeePolicy.forNetwork('devnet') })
const funder = await createKeyPairFromPrivateKeyBytes(Buffer.from(fs.readFileSync(process.env.TEST_WALLET_FILE, 'utf8').trim(), 'hex'))
async function user() {
  const kp = await generateKeyPair(); const owner = await getAddressFromPublicKey(kp.publicKey)
  const sig = await signBytes(kp.privateKey, new TextEncoder().encode('Sign in to pullhaus ' + owner))
  const secret = new Uint8Array(createHash('sha256').update('pullhaus/shielded-key/v1').update(Buffer.from(sig)).digest())
  const shielded = ShieldedKeypair.fromKeypair(SigningKey.fromEd25519Bytes(secret))
  const keys = LocalKeys.fromKeypair(shielded, client.proofService)
  return { kp, owner, shielded, keys, wallet: new Wallet({ identity: keys.address() }), ownerKp: await createKeyPairFromPrivateKeyBytes(secret) }
}
async function fund(to, amount) { const s = await createSignerFromKeyPair(funder); const { value: bh } = await client.solanaRpc.getLatestBlockhash().send(); const m = pipe(createTransactionMessage({ version: 0 }), (x) => setTransactionMessageFeePayerSigner(s, x), (x) => setTransactionMessageLifetimeUsingBlockhash(bh, x), (x) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: s, destination: to, amount }), x)); const sig = await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(await signTransactionMessageWithSigners(m)), { encoding: 'base64' }).send(); await client.confirmTransaction(sig) }
async function send(kps, tx, priv = true) { const s = await partiallySignTransaction(kps, tx); const sig = await client.solanaRpc.sendTransaction(getBase64EncodedWireTransaction(s), { encoding: 'base64' }).send(); if (priv) await client.confirmPrivateTransaction(sig); else await client.confirmTransaction(sig); return sig }
const D = await user(), E = await user()
await fund(D.owner, 100_000_000n); await fund(E.owner, 20_000_000n)
for (const u of [D, E]) { const tx = await buildRegistrationTransaction({ client, owner: u.owner, address: u.keys.address() }); if (tx) await send([u.kp], tx, false) }
await send([D.kp], await buildDepositTransaction({ client, feePayer: D.owner, asset: SOL_MINT, amount: 30_000_000n, recipient: D.keys.address() }))
await syncWallet({ wallet: D.wallet, keys: D.keys, client })
const r = await resolveRegisteredAddress({ rpc: client, owner: E.owner })
console.log('E registry address matches E keys:', hex(r.address.toBytes()) === hex(E.keys.address().toBytes()))
const sig = await send([D.kp, D.ownerKp], await buildTransferTransaction({ client, wallet: D.wallet, keys: D.keys, feePayer: D.owner, recipient: r.address, asset: SOL_MINT, amount: 10_000_000n }))
const res = await client.getShieldedTransactionsBySignature(sig)
console.log('tx outputs:', J(res).slice(0, 1400))
console.log('E confidentialViewTag:', hex(E.keys.address().confidentialViewTag()))
try { console.log('E bootstrap tag:', hex(E.shielded.recipientBootstrapViewTag?.() ?? E.shielded.viewingKey?.().recipientBootstrapViewTag?.())) } catch (e) { console.log('bootstrap tag n/a', e.message) }
await syncWallet({ wallet: E.wallet, keys: E.keys, client })
console.log('E balance after sync:', getPrivateTokenBalances(E.wallet).map((b) => b.amount.toString()))
