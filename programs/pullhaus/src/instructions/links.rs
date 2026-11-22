use crate::state::PayLink;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

#[derive(Accounts)]
#[instruction(id: [u8; 16])]
pub struct CreateLink<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    pub mint: Account<'info, Mint>,
    #[account(init, payer = owner, space = PayLink::SIZE, seeds = [b"link", owner.key().as_ref(), id.as_ref()], bump)]
    pub link: Account<'info, PayLink>,
    pub system_program: Program<'info, System>,
}

pub fn create_link(ctx: Context<CreateLink>, id: [u8; 16], amount: Option<u64>, reusable: bool) -> Result<()> {
    let l = &mut ctx.accounts.link;
    l.owner = ctx.accounts.owner.key();
    l.id = id;
    l.mint = ctx.accounts.mint.key();
    l.amount = amount;
    l.reusable = reusable;
    l.active = true;
    l.bump = ctx.bumps.link;
    Ok(())
}

#[derive(Accounts)]
pub struct CloseLink<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, has_one = owner, close = owner, seeds = [b"link", owner.key().as_ref(), link.id.as_ref()], bump = link.bump)]
    pub link: Account<'info, PayLink>,
}

pub fn close_link(_ctx: Context<CloseLink>) -> Result<()> {
    Ok(())
}
