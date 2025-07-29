# Anchor NFT Marketplace

A decentralized NFT marketplace smart contract built on Solana using the Anchor framework.

## Overview

This marketplace enables users to create marketplaces, list verified NFTs for sale, purchase NFTs with automatic fee distribution, and delist NFTs with proper authorization. The contract includes a reward system that mints tokens to buyers upon successful purchases.

## Features

- Create marketplace with admin controls and configurable fees
- List verified NFTs for sale with price validation
- Purchase NFTs with automatic fee distribution to sellers and treasury
- Delist NFTs with maker authorization
- Reward system for buyers using SPL tokens
- Collection verification for NFT authenticity
- Comprehensive error handling and security validations

## Program Structure

### Instructions

- `init_marketplace` - Initialize a new marketplace with admin and fee configuration
- `list` - List an NFT for sale with price validation and collection verification
- `delist` - Remove an NFT from sale (only by original maker)
- `purchase` - Buy a listed NFT with SOL, fee distribution, and buyer rewards

### State Accounts

- `Marketplace` - Stores admin info, fee percentage, PDA bumps, and marketplace name
- `Listing` - Individual NFT listing with maker, mint, price, and PDA bump

### Error Handling

- Custom error types for validation failures, arithmetic overflow, and authorization
- Comprehensive input validation and safety checks
- Proper overflow protection for fee calculations

## Development

### Prerequisites

- Rust and Cargo
- Solana CLI tools
- Anchor CLI
- Node.js and Yarn

### Build

```bash
anchor build
```

### Test

```bash
anchor test
```

### Lint

```bash
yarn lint              # Check formatting
yarn lint:fix          # Fix formatting issues
```

### Deploy

```bash
anchor deploy
```

## Configuration

- **Cluster**: localnet (configured in Anchor.toml)
- **Program ID**: `DPLToTUHht3k1KVa4CimxqWdcdqu131ZMN1vGmYw8w5L`
- **Wallet**: `~/.config/solana/id.json`
- **Package Manager**: yarn

## Dependencies

- Anchor Framework v0.30.1 (Rust), v0.31.1 (TypeScript)
- anchor-spl v0.30.1 with metadata features for NFT handling
- Solana Program Library for token operations

## Security

The contract implements several security measures:

- Price validation (must be greater than zero)
- Fee validation (maximum 10000 basis points = 100%)
- Maker authorization for delist operations
- Collection verification for NFT authenticity
- Arithmetic overflow protection
- Proper error handling throughout all operations
