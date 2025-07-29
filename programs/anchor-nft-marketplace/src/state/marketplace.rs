use anchor_lang::prelude::*;

/// Marketplace account storing admin info, fees, and PDA bumps
#[account]
pub struct Marketplace {
    /// Admin pubkey who can manage the marketplace
    pub admin: Pubkey,
    /// Fee percentage in basis points (0-10000, where 10000 = 100%)
    pub fee: u16,

    /// PDA bump for marketplace account
    pub bump: u8,
    /// PDA bump for treasury account
    pub treasury_bump: u8,
    /// PDA bump for rewards mint account
    pub rewards_mint_bump: u8,

    /// Marketplace name (max 32 characters)
    pub name: String,
}

impl Space for Marketplace {
    // 8 (discriminator) + 32 (admin) + 2 (fee) + 1 (bump) + 1 (treasury_bump) + 1 (rewards_mint_bump) + 4 (string length) + 32 (max name)
    const INIT_SPACE: usize = 8 + 32 + 2 + 1 + 1 + 1 + (4 + 32);
}