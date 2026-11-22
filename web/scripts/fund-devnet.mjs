// Devnet only: send test SOL from the persistent test wallet to an address.
import { appendTransactionMessageInstruction, createKeyPairFromPrivateKeyBytes, createSignerFromKeyPair, createSolanaRpc, createTransactionMessage, getBase64EncodedWireTransaction, pipe, setTransactionMessageFeePayerSigner, setTransactionMessageLifetimeUsingBlockhash, signTransactionMessageWithSigners, address } from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import fs from 'node:fs'
const rpc = createSolanaRpc(`https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`)
const signer = await createSignerFromKeyPair(await createKeyPairFromPrivateKeyBytes(Buffer.from(fs.readFileSync(process.env.TEST_WALLET_FILE, 'utf8').trim(), 'hex')))
const [to, lamports] = [address(process.argv[2]), BigInt(process.argv[3])]
const { value: bh } = await rpc.getLatestBlockhash().send()
const msg = pipe(createTransactionMessage({ version: 0 }), (m) => setTransactionMessageFeePayerSigner(signer, m), (m) => setTransactionMessageLifetimeUsingBlockhash(bh, m), (m) => appendTransactionMessageInstruction(getTransferSolInstruction({ source: signer, destination: to, amount: lamports }), m))
const sig = await rpc.sendTransaction(getBase64EncodedWireTransaction(await signTransactionMessageWithSigners(msg)), { encoding: 'base64' }).send()
for (let i = 0; i < 30; i++) { const { value } = await rpc.getSignatureStatuses([sig]).send(); if (value[0]?.confirmationStatus) break; await new Promise((r) => setTimeout(r, 1000)) }
console.log('sent', lamports.toString(), 'lamports to', to, '→ balance', (await rpc.getBalance(to).send()).value.toString())
