#!/usr/bin/env bash
# Deploys the pullhaus program to Solana mainnet, then hands upgrade authority
# to the company treasury so only that wallet can upgrade or close it.
#
# Needs: Solana CLI + Anchor 0.32, a deployer keypair with enough SOL for
# program rent (anchor prints the size; budget a few SOL), and
# target/deploy/pullhaus-keypair.json matching declare_id! (run `anchor keys sync`).
#
# The treasury's private key is never needed here.
set -euo pipefail
cd "$(dirname "$0")/.."

TREASURY=6T9AvUXqBnSrSxwdLmUnxttgdkSqyWDUQUcYqZf7mkpv
RPC=${RPC_URL:-https://api.mainnet-beta.solana.com}
DEPLOYER=${DEPLOYER_KEYPAIR:-$HOME/.config/solana/id.json}

command -v solana >/dev/null || { echo "Install the Solana CLI first: https://solana.com/docs/intro/installation"; exit 1; }
anchor keys sync
anchor build --verifiable
PROGRAM_ID=$(solana address -k target/deploy/pullhaus-keypair.json)
SIZE=$(wc -c < target/verifiable/pullhaus.so)

echo "Program:   $PROGRAM_ID"
echo "Deployer:  $(solana address -k "$DEPLOYER") ($(solana balance -k "$DEPLOYER" -u "$RPC"))"
echo "Rent:      $(solana rent "$((SIZE * 2))" -u "$RPC" | head -1)  (2x program size, room for upgrades)"
echo "Authority: $TREASURY after deploy"
read -rp "Deploy to MAINNET? Type 'mainnet' to continue: " ok
[ "$ok" = "mainnet" ] || { echo "Aborted."; exit 1; }

solana program deploy target/verifiable/pullhaus.so \
  --program-id target/deploy/pullhaus-keypair.json \
  --keypair "$DEPLOYER" --url "$RPC" --max-len "$((SIZE * 2))"

solana program set-upgrade-authority "$PROGRAM_ID" \
  --new-upgrade-authority "$TREASURY" --skip-new-upgrade-authority-signer-check \
  --keypair "$DEPLOYER" --url "$RPC"

solana program show "$PROGRAM_ID" --url "$RPC"
echo "Done. Upgrade authority is now the company treasury."
