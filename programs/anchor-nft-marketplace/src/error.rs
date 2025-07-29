use anchor_lang::error_code;

#[error_code]
pub enum MarketplaceError {
    #[msg("Name must be less than or equal to 32 characters")]
    NameTooLong,
    #[msg("Fee must be less than or equal to 10000 basis points (100%)")]
    FeeTooHigh,
    #[msg("Invalid collection address")]
    CollectionInvalid,
    #[msg("Collection not verified")]
    CollectionNotVerified,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Arithmetic overflow in fee calculation")]
    ArithmeticOverflow,
    #[msg("Unauthorized: Only the listing maker can delist")]
    UnauthorizedDelist,
    #[msg("Invalid mint decimals")]
    InvalidMintDecimals,
}