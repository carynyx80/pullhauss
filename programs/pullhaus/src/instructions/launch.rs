use crate::errors::HausError;
use crate::events::CurveTrade;
use crate::state::Launch;
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, spl_token::instruction::AuthorityType, Mint, MintTo, SetAuthority, Token, TokenAccount, Transfer};

pub const DECIMALS: u8 = 6;
/// Starting price: 1 / P0_DEN lamports per base unit (20 lamports per whole token).
pub const P0_DEN: u128 = 50_000;
/// Price rises linearly to (1 + SLOPE)x at sell-out.
pub const SLOPE: u128 = 39;

/// Lamport cost of moving the curve from `sold` to `sold + dx` (area under the line).
pub fn curve_cost(sold: u64, dx: u64, supply: u64, round_up: bool) -> Option<u64> {
    let (s, d, n) = (sold as u128, dx as u128, supply as u128);
    let num = d.checked_mul(2 * n + SLOPE * (2 * s + d))?;
    let den = 2 * n * P0_DEN;
    let v = if round_up { num.div_ceil(den) } else { num / den };
    u64::try_from(v).ok()
}

/// Largest dx whose cost is <= budget (binary search, ~50 iterations).
pub fn tokens_for(sold: u64, supply: u64, budget: u64) -> u64 {
    let (mut lo, mut hi) = (0u64, supply - sold);
    while lo < hi {
        let mid = lo + (hi - lo).div_ceil(2);
        match curve_cost(sold, mid, supply, true) {
            Some(c) if c <= budget => lo = mid,
            _ => hi = mid - 1,
        }
    }
    lo
}

#[derive(Accounts)]
pub struct CreateLaunch<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(init, payer = creator, mint::decimals = DECIMALS, mint::authority = launch)]
    pub mint: Account<'info, Mint>,
    #[account(init, payer = creator, space = Launch::SIZE, seeds = [b"launch", mint.key().as_ref()], bump)]
    pub launch: Box<Account<'info, Launch>>,
    #[account(init, payer = creator, seeds = [b"curve", launch.key().as_ref()], bump, token::mint = mint, token::authority = launch)]
    pub curve_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_launch(ctx: Context<CreateLaunch>, name: String, symbol: String, supply_whole: u64) -> Result<()> {
    require!(!name.is_empty() && name.len() <= 32, HausError::BadMetadata);
    require!(!symbol.is_empty() && symbol.len() <= 10 && symbol.bytes().all(|b| b.is_ascii_alphanumeric()), HausError::BadMetadata);
    require!(supply_whole >= 1_000, HausError::BadAmount);
    let supply = supply_whole.checked_mul(10u64.pow(DECIMALS as u32)).ok_or(HausError::BadAmount)?;
    require!(supply <= 1_000_000_000_000_000_000, HausError::BadAmount);

    let mint_key = ctx.accounts.mint.key();
    let l = &mut ctx.accounts.launch;
    l.creator = ctx.accounts.creator.key();
    l.mint = mint_key;
    l.name = [0u8; 32];
    l.name[..name.len()].copy_from_slice(name.as_bytes());
    l.symbol = [0u8; 10];
    l.symbol[..symbol.len()].copy_from_slice(symbol.as_bytes());
    l.supply = supply;
    l.bump = ctx.bumps.launch;

    let bump = [l.bump];
    let seeds: &[&[u8]] = &[b"launch", mint_key.as_ref(), &bump];
    let tp = ctx.accounts.token_program.to_account_info();
    token::mint_to(
        CpiContext::new_with_signer(tp.clone(), MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.curve_token.to_account_info(),
            authority: ctx.accounts.launch.to_account_info(),
        }, &[seeds]),
        supply,
    )?;
    // Fixed supply forever.
    token::set_authority(
        CpiContext::new_with_signer(tp, SetAuthority {
            current_authority: ctx.accounts.launch.to_account_info(),
            account_or_mint: ctx.accounts.mint.to_account_info(),
        }, &[seeds]),
        AuthorityType::MintTokens,
        None,
    )?;
    Ok(())
}

#[derive(Accounts)]
pub struct Trade<'info> {
    #[account(mut)]
    pub trader: Signer<'info>,
    #[account(mut, seeds = [b"launch", launch.mint.as_ref()], bump = launch.bump)]
    pub launch: Box<Account<'info, Launch>>,
    #[account(mut, seeds = [b"curve", launch.key().as_ref()], bump)]
    pub curve_token: Account<'info, TokenAccount>,
    #[account(mut, token::mint = launch.mint, token::authority = trader)]
    pub trader_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn buy(ctx: Context<Trade>, lamports_in: u64, min_tokens: u64) -> Result<()> {
    let l = &ctx.accounts.launch;
    require!(!l.complete, HausError::CurveComplete);
    let dx = tokens_for(l.sold, l.supply, lamports_in);
    require!(dx > 0 && dx >= min_tokens, HausError::Slippage);
    let cost = curve_cost(l.sold, dx, l.supply, true).ok_or(HausError::BadAmount)?;

    system_program::transfer(
        CpiContext::new(ctx.accounts.system_program.to_account_info(), system_program::Transfer {
            from: ctx.accounts.trader.to_account_info(),
            to: ctx.accounts.launch.to_account_info(),
        }),
        cost,
    )?;
    let mint = l.mint;
    let bump = [l.bump];
    let seeds: &[&[u8]] = &[b"launch", mint.as_ref(), &bump];
    token::transfer(
        CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.curve_token.to_account_info(),
            to: ctx.accounts.trader_token.to_account_info(),
            authority: ctx.accounts.launch.to_account_info(),
        }, &[seeds]),
        dx,
    )?;
    let l = &mut ctx.accounts.launch;
    l.sold += dx;
    l.reserve_lamports += cost;
    l.complete = l.sold == l.supply;
    emit!(CurveTrade { launch: l.key(), buy: true, tokens: dx, lamports: cost, sold: l.sold });
    Ok(())
}

pub fn sell(ctx: Context<Trade>, tokens: u64, min_lamports: u64) -> Result<()> {
    let l = &ctx.accounts.launch;
    require!(!l.complete, HausError::CurveComplete);
    require!(tokens > 0 && tokens <= l.sold, HausError::BadAmount);
    let refund = curve_cost(l.sold - tokens, tokens, l.supply, false).ok_or(HausError::BadAmount)?;
    require!(refund >= min_lamports && refund <= l.reserve_lamports, HausError::Slippage);

    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), Transfer {
            from: ctx.accounts.trader_token.to_account_info(),
            to: ctx.accounts.curve_token.to_account_info(),
            authority: ctx.accounts.trader.to_account_info(),
        }),
        tokens,
    )?;
    ctx.accounts.launch.sub_lamports(refund)?;
    ctx.accounts.trader.add_lamports(refund)?;
    let l = &mut ctx.accounts.launch;
    l.sold -= tokens;
    l.reserve_lamports -= refund;
    emit!(CurveTrade { launch: l.key(), buy: false, tokens, lamports: refund, sold: l.sold });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn curve_roundtrip() {
        let supply = 1_000_000_000 * 1_000_000u64;
        // first whole token costs 20 lamports plus a sliver of slope, rounded up for buys
        assert_eq!(curve_cost(0, 1_000_000, supply, true), Some(21));
        assert_eq!(curve_cost(0, 1_000_000, supply, false), Some(20));
        // selling out raises 410 SOL: average price is 20.5x start (1x→40x), 1e15 units * 20.5 / 50_000
        let full = curve_cost(0, supply, supply, false).unwrap();
        assert_eq!(full, 410_000_000_000);
        let dx = tokens_for(0, supply, 1_000_000_000);
        assert!(curve_cost(0, dx, supply, true).unwrap() <= 1_000_000_000);
        assert!(curve_cost(0, dx + 1, supply, true).unwrap() > 1_000_000_000);
        // selling back what you bought never refunds more than you paid
        let paid = curve_cost(0, dx, supply, true).unwrap();
        let refund = curve_cost(0, dx, supply, false).unwrap();
        assert!(refund <= paid);
    }
}
