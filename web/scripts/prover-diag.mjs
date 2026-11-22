import { createSprClient } from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
const KEY = process.env.HELIUS_API_KEY
const show = (e) => { const out = []; let c = e; while (c) { out.push({ name: c.name, code: c.code, msg: c.message, details: c.details ?? c.facts }); c = c.cause } return JSON.stringify(out, (_k, v) => typeof v === 'bigint' ? v.toString() : v, 1) }
for (const cluster of ['devnet', 'mainnet']) {
  const client = await createSprClient({ solanaRpcUrl: `https://${cluster}.helius-rpc.com/?api-key=${KEY}`, proverTee: SignedTeePolicy.forNetwork(cluster) })
  console.log(`== ${cluster}`)
  for (const [name, fn] of [['proverHealth', () => client.proverHealth()], ['attestProver', () => client.attestProver()], ['fetchProvingKeySet', () => client.fetchProvingKeySet()]]) {
    try { const r = await fn(); console.log(`  ${name}: OK`, JSON.stringify(r, (_k, v) => typeof v === 'bigint' ? v.toString() : (v instanceof Uint8Array ? `<${v.length} bytes>` : v)).slice(0, 220)) }
    catch (e) { console.log(`  ${name}: FAIL`, show(e).slice(0, 700)) }
  }
}
