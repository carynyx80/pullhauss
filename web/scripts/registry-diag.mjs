import { createSprClient } from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
import { isWalletRegistered, resolveRegisteredAddress, fetchUserRecord } from '@heliuslabs/spr/wallet'
import { address } from '@solana/kit'
const client = await createSprClient({ solanaRpcUrl: `https://${process.argv[3] ?? 'devnet'}.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, proverTee: SignedTeePolicy.forNetwork(process.argv[3] ?? 'devnet') })
const owner = address(process.argv[2])
const chain = (e) => { const o = []; let c = e; while (c) { o.push(`${c.code ?? c.name}: ${c.message}${c.details ? ' ' + JSON.stringify(c.details) : ''}`); c = c.cause } return o.join(' ← ') }
for (const [n, f] of [['isWalletRegistered', () => isWalletRegistered({ rpc: client, owner })], ['resolveRegisteredAddress', () => resolveRegisteredAddress({ rpc: client, owner })], ['fetchUserRecord', () => fetchUserRecord({ rpc: client, owner })]]) {
  try { const r = await f(); console.log(n, 'OK', r === undefined ? 'undefined' : typeof r === 'boolean' ? r : 'record') } catch (e) { console.log(n, 'FAIL', chain(e)) }
}
