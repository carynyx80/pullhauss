/**
 * pullhaus keeper service (runs on Railway).
 *
 * Private balances, proofs and transfers are handled by Helius Privacy Rings
 * in the browser, so this is the only server pullhaus runs. It:
 *   - serves GET /health and GET /info for monitoring and the frontend
 *   - watches the pullhaus program's logs once PROGRAM_ID is set
 *   - fills hidden limit/DCA orders once KEEPER_SECRET_KEY is set
 *     (order filling itself is still TODO: terms decryption, price feed,
 *     Jupiter routing, then execute_order)
 *
 * With nothing configured it runs in "idle" mode and stays healthy.
 */
import http from 'node:http'
import { Connection, Keypair, PublicKey } from '@solana/web3.js'

const PORT = Number(process.env.PORT ?? 8080)
const RPC_URL = process.env.RPC_URL ?? 'https://api.mainnet-beta.solana.com'
const TREASURY = '6T9AvUXqBnSrSxwdLmUnxttgdkSqyWDUQUcYqZf7mkpv'
const FEE_BPS = 25
const started = Date.now()

function parseProgramId(v: string | undefined) {
  if (!v) return null
  try { return new PublicKey(v) } catch { console.error('PROGRAM_ID is not a valid address; ignoring'); return null }
}
function parseKeypair(v: string | undefined) {
  if (!v) return null
  try { return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(v))) } catch { console.error('KEEPER_SECRET_KEY is not a JSON byte array; ignoring'); return null }
}

const programId = parseProgramId(process.env.PROGRAM_ID)
const keeper = parseKeypair(process.env.KEEPER_SECRET_KEY)
const mode = !programId ? 'idle' : !keeper ? 'watching' : 'keeper'
const stats = { programLogs: 0, ordersSeen: 0, lastEventAt: 0 as number }

if (programId) {
  const connection = new Connection(RPC_URL, 'confirmed')
  connection.onLogs(programId, (l) => {
    stats.programLogs++
    stats.lastEventAt = Date.now()
    if (l.logs.some((x) => x.includes('Instruction: PlaceOrder'))) {
      stats.ordersSeen++
      console.log(`order placed in ${l.signature}`)
      // TODO: decrypt terms, track price, call execute_order when crossed
    }
  }, 'confirmed')
  console.log(`watching program ${programId.toBase58()}`)
}

const json = (res: http.ServerResponse, code: number, body: unknown) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
  res.end(JSON.stringify(body))
}

http.createServer((req, res) => {
  const path = (req.url ?? '/').split('?')[0]
  if (path === '/health') return json(res, 200, { ok: true, mode, uptimeSec: Math.round((Date.now() - started) / 1000) })
  if (path === '/info') return json(res, 200, {
    service: 'pullhaus-keeper', mode, treasury: TREASURY, feeBps: FEE_BPS,
    programId: programId?.toBase58() ?? null, keeper: keeper?.publicKey.toBase58() ?? null, stats,
  })
  json(res, 404, { error: 'not found' })
}).listen(PORT, () => console.log(`pullhaus keeper (${mode}) on :${PORT}`))
