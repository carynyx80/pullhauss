//! pullhaus program: the features Helius Solana Privacy Rings don't provide.
//!
//! Private balances, transfers, proofs and verification all come from Privacy
//! Rings (program ring1GaLCuJnkUMVkX2JeZLTTX17wKsV4fZmPVzXANW). This program
//! adds stealth-payment announcements, payment-link records, hidden limit/DCA
//! order escrow and anonymous-buyer bonding-curve launches.
#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::OrderTerms;

declare_id!("8qH8pU47fM3XGRjWr9i5MojLv8WLDgFCZakd4B5kePGC");

#[program]
pub mod pullhaus {
    use super::*;

    // ---- stealth
    pub fn announce(ctx: Context<Announce>, ephemeral_pubkey: [u8; 32], stealth_address: Pubkey, view_tag: u8, metadata: Vec<u8>) -> Result<()> {
        instructions::stealth::announce(ctx, ephemeral_pubkey, stealth_address, view_tag, metadata)
    }

    // ---- payment links
    pub fn create_link(ctx: Context<CreateLink>, id: [u8; 16], amount: Option<u64>, reusable: bool) -> Result<()> {
        instructions::links::create_link(ctx, id, amount, reusable)
    }

    pub fn close_link(ctx: Context<CloseLink>) -> Result<()> {
        instructions::links::close_link(ctx)
    }

    // ---- hidden orders
    pub fn place_order(ctx: Context<PlaceOrder>, order_hash: [u8; 32], amount: u64, keeper: Pubkey, enc_terms: Vec<u8>) -> Result<()> {
        instructions::orders::place_order(ctx, order_hash, amount, keeper, enc_terms)
    }

    pub fn execute_order(ctx: Context<ExecuteOrder>, terms: OrderTerms, salt: [u8; 32], amount_out: u64) -> Result<()> {
        instructions::orders::execute_order(ctx, terms, salt, amount_out)
    }

    pub fn cancel_order(ctx: Context<CancelOrder>, terms: OrderTerms, salt: [u8; 32]) -> Result<()> {
        instructions::orders::cancel_order(ctx, terms, salt)
    }

    // ---- forge
    pub fn create_launch(ctx: Context<CreateLaunch>, name: String, symbol: String, supply_whole: u64) -> Result<()> {
        instructions::launch::create_launch(ctx, name, symbol, supply_whole)
    }

    pub fn buy(ctx: Context<Trade>, lamports_in: u64, min_tokens: u64) -> Result<()> {
        instructions::launch::buy(ctx, lamports_in, min_tokens)
    }

    pub fn sell(ctx: Context<Trade>, tokens: u64, min_lamports: u64) -> Result<()> {
        instructions::launch::sell(ctx, tokens, min_lamports)
    }
}
