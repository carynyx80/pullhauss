import { createSprClient } from '@heliuslabs/spr'
import { SignedTeePolicy } from '@heliuslabs/spr/client'
import { fetchUserRecord } from '@heliuslabs/spr/wallet'
import { address } from '@solana/kit'
import { USER_REGISTRY_PROGRAM_ID } from '@heliuslabs/spr'
const net = 'devnet'
const client = await createSprClient({ solanaRpcUrl: `https://${net}.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`, proverTee: SignedTeePolicy.forNetwork(net) })
// any registered devnet wallet: find its record account size via program accounts
const accts = await client.solanaRpc.getProgramAccounts(USER_REGISTRY_PROGRAM_ID, { encoding: 'base64', dataSlice: { offset: 0, length: 0 } }).send()
console.log('registry accounts on devnet:', accts.length)
const sizes = new Set()
for (const a of accts.slice(0, 20)) { const info = await client.solanaRpc.getAccountInfo(a.pubkey, { encoding: 'base64' }).send(); sizes.add(Buffer.from(info.value.data[0], 'base64').length) }
console.log('record sizes (bytes):', [...sizes])
