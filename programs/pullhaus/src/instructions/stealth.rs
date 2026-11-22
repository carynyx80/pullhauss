use crate::errors::HausError;
use crate::events::StealthAnnouncement;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Announce<'info> {
    pub sender: Signer<'info>,
}

/// Emits a stealth payment announcement. Recipients scan these with their view key;
/// `view_tag` (first byte of the shared secret) lets them skip ~255/256 quickly.
pub fn announce(_ctx: Context<Announce>, ephemeral_pubkey: [u8; 32], stealth_address: Pubkey, view_tag: u8, metadata: Vec<u8>) -> Result<()> {
    require!(metadata.len() <= 64, HausError::PayloadTooLarge);
    emit!(StealthAnnouncement { ephemeral_pubkey, stealth_address, view_tag, metadata });
    Ok(())
}
