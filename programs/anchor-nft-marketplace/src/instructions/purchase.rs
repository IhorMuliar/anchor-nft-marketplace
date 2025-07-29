use anchor_lang::{ prelude::*, system_program::{ transfer, Transfer } };
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        close_account,
        transfer_checked,
        CloseAccount,
        Mint,
        TokenAccount,
        TokenInterface,
        TransferChecked,
        MintTo,
        mint_to,
    },
};

use crate::{ error::MarketplaceError, state::{ Listing, Marketplace } };

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub taker: Signer<'info>,

    pub maker: SystemAccount<'info>,
    pub maker_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init_if_needed,
        payer = taker,
        associated_token::authority = taker,
        associated_token::mint = maker_mint
    )]
    pub taker_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        seeds = [b"marketplace", marketplace.name.as_str().as_bytes()],
        bump = marketplace.bump
    )]
    pub marketplace: Account<'info, Marketplace>,

    #[account(
      mut,
      close = maker,
      seeds = [marketplace.key().as_ref(), listing.mint.as_ref()],
      bump = listing.bump
  )]
    pub listing: Account<'info, Listing>,

    #[account(
      mut,
      associated_token::authority = listing,
      associated_token::mint = maker_mint,
  )]
    pub vault: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"rewards_mint", marketplace.key().as_ref()],
        bump = marketplace.rewards_mint_bump,
        mint::decimals = 6,
        mint::authority = marketplace,
    )]
    pub rewards: Box<InterfaceAccount<'info, Mint>>,

    #[account(seeds = [b"treasury", marketplace.key().as_ref()], bump = marketplace.treasury_bump)]
    pub treasury: SystemAccount<'info>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Purchase<'info> {
    pub fn reward_buyer(&mut self) -> Result<()> {
        let cpi_program = self.token_program.to_account_info();

        let accounts = MintTo {
            mint: self.rewards.to_account_info(),
            authority: self.marketplace.to_account_info(),
            to: self.taker.to_account_info(),
        };

        let seeds = &[b"marketplace", self.marketplace.name.as_bytes(), &[self.marketplace.bump]];
        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(cpi_program, accounts, signer_seeds);

        mint_to(ctx, 1)?;

        Ok(())
    }

    pub fn send_sol(&mut self) -> Result<()> {
        let fee_amount = self.listing.price
            .checked_mul(self.marketplace.fee as u64)
            .and_then(|x| x.checked_div(10000))
            .ok_or(MarketplaceError::ArithmeticOverflow)?;

        let _total_amount = self.listing.price
            .checked_add(fee_amount)
            .ok_or(MarketplaceError::ArithmeticOverflow)?;

        let accounts = Transfer {
            from: self.taker.to_account_info(),
            to: self.maker.to_account_info(), //it's a pubkey
        };

        let fee_accounts = Transfer {
            from: self.taker.to_account_info(),
            to: self.treasury.to_account_info(),
        };

        let ctx = CpiContext::new(self.system_program.to_account_info(), accounts);
        let fee_ctx = CpiContext::new(self.system_program.to_account_info(), fee_accounts);

        transfer(ctx, self.listing.price)?;
        transfer(fee_ctx, fee_amount)?;
        Ok(())

    }
    pub fn transfer_nft(&mut self) -> Result<()> {
        let accounts = TransferChecked {
            from: self.vault.to_account_info(),
            mint: self.maker_mint.to_account_info(),
            to: self.taker_ata.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let seeds = &[
            self.marketplace.to_account_info().key.as_ref(),
            self.listing.mint.as_ref(),
            &[self.listing.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            signer_seeds
        );

        transfer_checked(ctx, 1, self.maker_mint.decimals)?;
        Ok(())
    }
    pub fn close_listing(&mut self) -> Result<()> {
        let accounts = CloseAccount {
            account: self.vault.to_account_info(),
            destination: self.maker.to_account_info(),
            authority: self.listing.to_account_info(),
        };

        let seeds = &[
            self.marketplace.to_account_info().key.as_ref(),
            self.listing.mint.as_ref(),
            &[self.listing.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(),
            accounts,
            signer_seeds
        );

        close_account(ctx)?;
        Ok(())
    }
}