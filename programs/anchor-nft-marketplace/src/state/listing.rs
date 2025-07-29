use anchor_lang::prelude::*;

/// Individual NFT listing account
#[account]
pub struct Listing {
    /// Pubkey of the NFT owner who created the listing
    pub maker: Pubkey,
    /// Mint address of the NFT being sold
    pub mint: Pubkey,
    /// Sale price in lamports
    pub price: u64,
    /// PDA bump for this listing account
    pub bump: u8,
}

impl Space for Listing {
    // 8 (discriminator) + 32 (maker) + 32 (mint) + 8 (price) + 1 (bump)
    const INIT_SPACE: usize = 8 + 32 + 32 + 8 + 1;
}