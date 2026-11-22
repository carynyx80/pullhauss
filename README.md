# pullhaus

Live at **https://www.pullhaus.xyz** (pullhaus.xyz and the old pullhauss.vercel.app redirect there).

A private money app on Solana, **powered by [Helius Solana Privacy Rings](https://www.helius.dev/docs/privacy)**.
Privacy Rings provide encrypted balances, ZK proofs and on-chain verification. pullhaus adds the product on top:
payment links, payroll, stealth addresses, hidden orders and anonymous-buyer launches.

| Folder | What | Status |
|---|---|---|
| `web/` | Landing, app (8 rooms), explorer, docs, `/pay/...` | **Vault, Send, Links run live on Privacy Rings** (`@heliuslabs/spr` 0.9.0-alpha); other rooms are simulated |
| `programs/pullhaus/` | Anchor: stealth `announce`, payment-link records, hidden-order escrow, launch curves | Type-checks, unit tests pass, not deployed |
| `keeper/` | Fills hidden orders | Skeleton, not installed or run |

## Company treasury & fees
Treasury: `6T9AvUXqBnSrSxwdLmUnxttgdkSqyWDUQUcYqZf7mkpv`
- Receives a **0.25% app fee** on private transfers, payroll and payment-link payments (recipients get the full amount).
- Becomes the **upgrade authority** of the pullhaus program on mainnet (`scripts/deploy-mainnet.sh`).
- Private fees only switch on after the treasury connects to pullhaus once and registers on Privacy Rings.

## What's private (default ring)
Asset, amount and balance are encrypted. Sender and recipient wallets are **visible**. Deposits into and
withdrawals out of the ring are public. Stealth addresses (in progress) hide the recipient.

## Run the web app
```bash
cd web
cp .env.example .env.local   # add VITE_HELIUS_API_KEY; defaults to MAINNET (set VITE_SPR_CLUSTER=devnet to test)
npm install
npm run dev
```
Without a key, the app runs in demo mode only.

## Program
```bash
cargo test -p pullhaus --lib
anchor build                  # needs Solana CLI
./scripts/deploy-mainnet.sh   # deploys, then hands upgrade authority to the treasury
```

## Status
Privacy Rings are in beta and the SDK is alpha. pullhaus is unaudited. The app defaults to mainnet, so test with small amounts.
