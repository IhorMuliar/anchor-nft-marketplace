#![allow(unexpected_cfgs)]
#![allow(deprecated)]

//! # Anchor NFT Marketplace
//! 
//! A decentralized NFT marketplace built on Solana using the Anchor framework.
//! Allows users to create marketplaces, list NFTs for sale, purchase NFTs, and delist NFTs.
//! 
//! ## Core Features
//! - Create marketplace with admin controls and configurable fees
//! - List verified NFTs for sale with price validation
//! - Purchase NFTs with automatic fee distribution
//! - Delist NFTs with proper authorization
//! - Reward system for buyers

use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;
pub mod error;

pub use instructions::*;
pub use state::*;

declare_id!("DPLToTUHht3k1KVa4CimxqWdcdqu131ZMN1vGmYw8w5L");

#[program]
pub mod nft_marketplace {
    use super::*;

    /// Initialize a new NFT marketplace
    /// 
    /// # Arguments
    /// * `name` - Marketplace name (max 32 characters)
    /// * `fees` - Fee percentage in basis points (max 10000 = 100%)
    pub fn init_marketplace(ctx: Context<Initialize>, name: String, fees: u16) -> Result<()> {
        ctx.accounts.init(name, fees, &ctx.bumps)?;
        Ok(())
    }

    /// List an NFT for sale
    /// 
    /// # Arguments
    /// * `price` - Sale price in lamports (must be > 0)
    pub fn list(ctx: Context<List>, price: u64) -> Result<()> {
        ctx.accounts.create_listing(price, &ctx.bumps)?;
        ctx.accounts.deposit_nft()?;
        Ok(())
    }

    /// Remove an NFT from sale (only by original maker)
    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        ctx.accounts.withdraw_nft()?;
        ctx.accounts.close_listing()?;
        Ok(())
    }

    /// Purchase a listed NFT
    /// 
    /// Transfers SOL to seller, fees to treasury, NFT to buyer, and mints reward tokens
    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        ctx.accounts.send_sol()?;
        ctx.accounts.transfer_nft()?;
        ctx.accounts.close_listing()?;
        ctx.accounts.reward_buyer()?;
        Ok(())
    }
}