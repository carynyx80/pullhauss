use anchor_lang::prelude::*;

#[event]
pub struct StealthAnnouncement {
    pub ephemeral_pubkey: [u8; 32],
    pub stealth_address: Pubkey,
    pub view_tag: u8,
    pub metadata: Vec<u8>,
}

#[event]
pub struct OrderPlaced {
    pub order: Pubkey,
    pub order_hash: [u8; 32],
    pub enc_terms: Vec<u8>,
}

#[event]
pub struct OrderExecuted {
    pub order: Pubkey,
    pub slice: u16,
    pub amount_out: u64,
}

#[event]
pub struct CurveTrade {
    pub launch: Pubkey,
    pub buy: bool,
    pub tokens: u64,
    pub lamports: u64,
    pub sold: u64,
}
