use anchor_lang::prelude::*;

#[error_code]
pub enum HausError {
    #[msg("Amount is out of range")]
    BadAmount,
    #[msg("Account does not match the order terms")]
    AccountMismatch,
    #[msg("Order terms do not match the commitment")]
    OrderHashMismatch,
    #[msg("Order output is below the limit")]
    BelowLimit,
    #[msg("Order is fully filled")]
    OrderFilled,
    #[msg("Encrypted payload too large")]
    PayloadTooLarge,
    #[msg("Bonding curve is sold out")]
    CurveComplete,
    #[msg("Slippage limit exceeded")]
    Slippage,
    #[msg("Invalid name or symbol")]
    BadMetadata,
}
