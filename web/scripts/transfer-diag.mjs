import { buildTransferTransaction, createSprClient, getPrivateTokenBalances, LocalKeys, SOL_MINT, syncWallet, Wallet } from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
import { ed25519DerivationMessage } from '@heliuslabs/spr/keypair'
import { address, createKeyPairFromPrivateKeyBytes, getAddressEncoder, getAddressFromPublicKey, signBytes } from '@solana/kit'
import fs from 'node:fs'
const client = await createSprClient({ solanaRpcUrl: `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, proverTee: SignedTeePolicy.forNetwork('devnet') })
const kp = await createKeyPairFromPrivateKeyBytes(Buffer.from(fs.readFileSync(process.env.TEST_WALLET_FILE, 'utf8').trim(), 'hex'))
const owner = await getAddressFromPublicKey(kp.publicKey)
const seed = await signBytes(kp.privateKey, ed25519DerivationMessage(new Uint8Array(getAddressEncoder().encode(owner))))
const keys = LocalKeys.fromDerivationSeed({ solanaPublicKey: owner, derivationSeed: seed }, client.proofService)
const wallet = new Wallet({ identity: keys.address() })
await syncWallet({ wallet, keys, client })
const b = getPrivateTokenBalances(wallet).find((x) => x.mint === SOL_MINT)
console.log('A private:', b?.amount?.toString(), 'lamports in', b?.utxos?.length, 'UTXOs; wallet.utxos():', wallet.utxos().length)
const dump = (e, d = 0) => { if (!e || d > 6) return; console.log('  '.repeat(d) + (e.code ?? e.name) + ': ' + e.message, e.details ? JSON.stringify(e.details, (_k, v) => typeof v === 'bigint' ? v.toString() : v) : ''); dump(e.cause, d + 1) }
try {
  await buildTransferTransaction({ client, wallet, keys, feePayer: owner, recipient: address(process.argv[2]), asset: SOL_MINT, amount: 2_000_000n })
  console.log('build OK')
} catch (e) { dump(e) }
