use anchor_lang::prelude::*;

/// A payment link record. Payments themselves are Helius Privacy Rings
/// deposits to `owner`; this account just lets wallets discover and verify terms.
#[account]
pub struct PayLink {
    pub owner: Pubkey,
    pub id: [u8; 16],
    pub mint: Pubkey,
    /// None = payer chooses (tip jar).
    pub amount: Option<u64>,
    pub reusable: bool,
    pub active: bool,
    pub bump: u8,
}
impl PayLink {
    pub const SIZE: usize = 8 + 32 + 16 + 32 + 9 + 1 + 1 + 1;
}

pub const MAX_ENC_TERMS: usize = 256;

#[account]
pub struct Order {
    pub order_hash: [u8; 32],
    pub mint_in: Pubkey,
    pub escrowed: u64,
    pub released: u64,
    pub slices_done: u16,
    pub keeper: Pubkey,
    pub created_slot: u64,
    pub bump: u8,
    pub escrow_bump: u8,
    /// Terms encrypted to the keeper; observers see only ciphertext.
    pub enc_terms: Vec<u8>,
}
impl Order {
    pub const SIZE: usize = 8 + 32 + 32 + 8 + 8 + 2 + 32 + 8 + 1 + 1 + 4 + MAX_ENC_TERMS;
}

/// Revealed by the keeper at execution (or by the owner at cancellation).
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct OrderTerms {
    pub mint_in: Pubkey,
    pub mint_out: Pubkey,
    pub amount_in: u64,
    /// Minimum total output for the full order; each slice must meet its pro-rata share.
    pub min_out: u64,
    pub slices: u16,
    /// One-time token account that receives output; the owner then deposits it into Privacy Rings.
    pub payout: Pubkey,
    pub cancel_authority: Pubkey,
}

#[account]
pub struct Launch {
    pub creator: Pubkey,
    pub mint: Pubkey,
    pub name: [u8; 32],
    pub symbol: [u8; 10],
    pub supply: u64,
    pub sold: u64,
    pub reserve_lamports: u64,
    pub complete: bool,
    pub bump: u8,
    pub mint_bump: u8,
}
impl Launch {
    pub const SIZE: usize = 8 + 32 + 32 + 32 + 10 + 8 + 8 + 8 + 1 + 1 + 1;
}
