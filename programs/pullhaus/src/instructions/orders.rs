use crate::errors::HausError;
use crate::events::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use solana_keccak_hasher as keccak;

pub fn order_hash(terms: &OrderTerms, salt: &[u8; 32]) -> Result<[u8; 32]> {
    Ok(keccak::hashv(&[&borsh::to_vec(terms)?[..], &salt[..]]).to_bytes())
}

#[derive(Accounts)]
#[instruction(order_hash: [u8; 32])]
pub struct PlaceOrder<'info> {
    /// Usually a one-time account funded by a Privacy Rings withdrawal in the same bundle.
    #[account(mut)]
    pub payer: Signer<'info>,
    pub mint_in: Account<'info, Mint>,
    #[account(mut, token::mint = mint_in, token::authority = payer)]
    pub payer_token: Account<'info, TokenAccount>,
    #[account(init, payer = payer, space = Order::SIZE, seeds = [b"order", order_hash.as_ref()], bump)]
    pub order: Box<Account<'info, Order>>,
    #[account(init, payer = payer, seeds = [b"escrow", order.key().as_ref()], bump, token::mint = mint_in, token::authority = order)]
    pub escrow: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn place_order(ctx: Context<PlaceOrder>, order_hash: [u8; 32], amount: u64, keeper: Pubkey, enc_terms: Vec<u8>) -> Result<()> {
    require!(amount > 0, HausError::BadAmount);
    require!(enc_terms.len() <= MAX_ENC_TERMS, HausError::PayloadTooLarge);
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.payer_token.to_account_info(),
            to: ctx.accounts.escrow.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        }),
        amount,
    )?;
    let o = &mut ctx.accounts.order;
    o.order_hash = order_hash;
    o.mint_in = ctx.accounts.mint_in.key();
    o.escrowed = amount;
    o.released = 0;
    o.slices_done = 0;
    o.keeper = keeper;
    o.created_slot = Clock::get()?.slot;
    o.bump = ctx.bumps.order;
    o.escrow_bump = ctx.bumps.escrow;
    o.enc_terms = enc_terms.clone();
    emit!(OrderPlaced { order: o.key(), order_hash, enc_terms });
    Ok(())
}

#[derive(Accounts)]
pub struct ExecuteOrder<'info> {
    pub keeper: Signer<'info>,
    #[account(mut, has_one = keeper, seeds = [b"order", order.order_hash.as_ref()], bump = order.bump)]
    pub order: Box<Account<'info, Order>>,
    #[account(mut, seeds = [b"escrow", order.key().as_ref()], bump = order.escrow_bump)]
    pub escrow: Account<'info, TokenAccount>,
    /// Keeper receives the escrowed input slice...
    #[account(mut, token::mint = order.mint_in)]
    pub keeper_in_token: Account<'info, TokenAccount>,
    /// ...and pays the output from here...
    #[account(mut, token::authority = keeper)]
    pub keeper_out_token: Account<'info, TokenAccount>,
    /// ...into the payout account fixed in the hidden terms.
    #[account(mut)]
    pub payout_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

/// Keeper reveals the terms and fills one slice. The payout destination is part of
/// the committed terms, so the keeper can't redirect the output.
pub fn execute_order(ctx: Context<ExecuteOrder>, terms: OrderTerms, salt: [u8; 32], amount_out: u64) -> Result<()> {
    let order = &ctx.accounts.order;
    require!(order_hash(&terms, &salt)? == order.order_hash, HausError::OrderHashMismatch);
    require_keys_eq!(terms.mint_in, order.mint_in, HausError::OrderHashMismatch);
    require_keys_eq!(ctx.accounts.payout_token.key(), terms.payout, HausError::AccountMismatch);
    require_keys_eq!(ctx.accounts.payout_token.mint, terms.mint_out, HausError::AccountMismatch);
    require_keys_eq!(ctx.accounts.keeper_out_token.mint, terms.mint_out, HausError::AccountMismatch);
    require!(terms.amount_in == order.escrowed && terms.slices > 0, HausError::OrderHashMismatch);
    require!(order.slices_done < terms.slices, HausError::OrderFilled);

    let slice = order.slices_done;
    let last = slice + 1 == terms.slices;
    let base = terms.amount_in / terms.slices as u64;
    let slice_in = if last { terms.amount_in - order.released } else { base };
    let slice_min_out = ((terms.min_out as u128) * (slice_in as u128) / (terms.amount_in as u128)) as u64;
    require!(amount_out >= slice_min_out && amount_out > 0, HausError::BelowLimit);

    let tp = ctx.accounts.token_program.to_account_info();
    token::transfer(
        CpiContext::new(tp.clone(), Transfer {
            from: ctx.accounts.keeper_out_token.to_account_info(),
            to: ctx.accounts.payout_token.to_account_info(),
            authority: ctx.accounts.keeper.to_account_info(),
        }),
        amount_out,
    )?;
    let hash = order.order_hash;
    let bump = [order.bump];
    let seeds: &[&[u8]] = &[b"order", hash.as_ref(), &bump];
    token::transfer(
        CpiContext::new_with_signer(tp, Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.keeper_in_token.to_account_info(),
            authority: ctx.accounts.order.to_account_info(),
        }, &[seeds]),
        slice_in,
    )?;

    let order = &mut ctx.accounts.order;
    order.slices_done += 1;
    order.released += slice_in;
    emit!(OrderExecuted { order: order.key(), slice, amount_out });
    Ok(())
}

#[derive(Accounts)]
pub struct CancelOrder<'info> {
    pub authority: Signer<'info>,
    #[account(mut, seeds = [b"order", order.order_hash.as_ref()], bump = order.bump)]
    pub order: Box<Account<'info, Order>>,
    #[account(mut, seeds = [b"escrow", order.key().as_ref()], bump = order.escrow_bump)]
    pub escrow: Account<'info, TokenAccount>,
    #[account(mut, token::mint = order.mint_in)]
    pub refund_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

pub fn cancel_order(ctx: Context<CancelOrder>, terms: OrderTerms, salt: [u8; 32]) -> Result<()> {
    let order = &ctx.accounts.order;
    require!(order_hash(&terms, &salt)? == order.order_hash, HausError::OrderHashMismatch);
    require_keys_eq!(ctx.accounts.authority.key(), terms.cancel_authority, HausError::OrderHashMismatch);
    let left = order.escrowed - order.released;
    require!(left > 0, HausError::OrderFilled);
    let hash = order.order_hash;
    let bump = [order.bump];
    let seeds: &[&[u8]] = &[b"order", hash.as_ref(), &bump];
    token::transfer(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.escrow.to_account_info(),
            to: ctx.accounts.refund_token.to_account_info(),
            authority: ctx.accounts.order.to_account_info(),
        }, &[seeds]),
        left,
    )?;
    let order = &mut ctx.accounts.order;
    order.released = order.escrowed;
    order.slices_done = terms.slices;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn hash_binds_payout() {
        let t = OrderTerms {
            mint_in: Pubkey::new_unique(), mint_out: Pubkey::new_unique(), amount_in: 100, min_out: 90,
            slices: 4, payout: Pubkey::new_unique(), cancel_authority: Pubkey::new_unique(),
        };
        let salt = [7u8; 32];
        let h = order_hash(&t, &salt).unwrap();
        let mut redirected = t.clone();
        redirected.payout = Pubkey::new_unique();
        assert_ne!(h, order_hash(&redirected, &salt).unwrap(), "changing the payout must change the hash");
        assert_ne!(h, order_hash(&t, &[8u8; 32]).unwrap());
    }
}
