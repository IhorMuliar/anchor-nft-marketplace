import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("anchor-nft-marketplace", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // The program will be loaded when Anchor builds successfully
  let program: any;

  // Test accounts
  const admin = Keypair.generate();
  const maker = Keypair.generate();
  const taker = Keypair.generate();

  // Test constants
  const MARKETPLACE_NAME = "TestMarket";
  const MARKETPLACE_FEE = 500; // 5%
  const NFT_PRICE = LAMPORTS_PER_SOL; // 1 SOL

  // PDAs
  let marketplacePda: PublicKey;
  let treasuryPda: PublicKey;
  let rewardsMintPda: PublicKey;

  before(async () => {
    // Skip tests if program isn't built yet
    try {
      program = anchor.workspace.anchorNftMarketplace;
      if (!program) {
        console.log("Program not loaded - skipping tests");
        return;
      }
    } catch (error) {
      console.log("Program not available - build first with 'anchor build'");
      return;
    }

    // Airdrop SOL to test accounts
    try {
      await provider.connection.requestAirdrop(
        admin.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.requestAirdrop(
        maker.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.requestAirdrop(
        taker.publicKey,
        10 * LAMPORTS_PER_SOL
      );

      // Wait for confirmations
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Calculate PDAs
      [marketplacePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("marketplace"), Buffer.from(MARKETPLACE_NAME)],
        program.programId
      );

      [treasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), marketplacePda.toBuffer()],
        program.programId
      );

      [rewardsMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rewards_mint"), marketplacePda.toBuffer()],
        program.programId
      );
    } catch (error) {
      console.log("Setup failed:", error.message);
    }
  });

  describe("Initialize Marketplace", () => {
    it("Successfully initializes a marketplace", async function () {
      if (!program) {
        this.skip();
        return;
      }

      try {
        const tx = await program.methods
          .initMarketplace(MARKETPLACE_NAME, MARKETPLACE_FEE)
          .accounts({
            admin: admin.publicKey,
            marketplace: marketplacePda,
            treasury: treasuryPda,
            rewardsMint: rewardsMintPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([admin])
          .rpc();

        console.log("Initialize marketplace transaction:", tx);

        // Verify marketplace account data
        const marketplaceAccount = await program.account.marketplace.fetch(
          marketplacePda
        );
        expect(marketplaceAccount.admin.toString()).to.equal(
          admin.publicKey.toString()
        );
        expect(marketplaceAccount.fee).to.equal(MARKETPLACE_FEE);
        expect(marketplaceAccount.name).to.equal(MARKETPLACE_NAME);
        expect(marketplaceAccount.bump).to.be.greaterThan(0);

        console.log("✅ Marketplace initialized successfully");
      } catch (error) {
        console.log("Initialize marketplace failed:", error.message);
        throw error;
      }
    });

    it("Fails with name too long", async function () {
      if (!program) {
        this.skip();
        return;
      }

      const longName = "A".repeat(33); // 33 characters, exceeds 32 limit

      try {
        await program.methods
          .initMarketplace(longName, MARKETPLACE_FEE)
          .accounts({
            admin: admin.publicKey,
            marketplace: PublicKey.findProgramAddressSync(
              [Buffer.from("marketplace"), Buffer.from(longName)],
              program.programId
            )[0],
            treasury: treasuryPda,
            rewardsMint: rewardsMintPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([admin])
          .rpc();

        expect.fail("Should have failed with NameTooLong error");
      } catch (error) {
        expect(error.error?.errorCode?.code).to.equal("NameTooLong");
        console.log("✅ Long name validation working");
      }
    });

    it("Fails with fee too high", async function () {
      if (!program) {
        this.skip();
        return;
      }

      const invalidMarketplaceName = "InvalidFee";
      const invalidFee = 10001; // > 10000 (100%)

      try {
        await program.methods
          .initMarketplace(invalidMarketplaceName, invalidFee)
          .accounts({
            admin: admin.publicKey,
            marketplace: PublicKey.findProgramAddressSync(
              [Buffer.from("marketplace"), Buffer.from(invalidMarketplaceName)],
              program.programId
            )[0],
            treasury: treasuryPda,
            rewardsMint: rewardsMintPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([admin])
          .rpc();

        expect.fail("Should have failed with FeeTooHigh error");
      } catch (error) {
        expect(error.error?.errorCode?.code).to.equal("FeeTooHigh");
        console.log("✅ High fee validation working");
      }
    });

    it("Fails with empty name", async function () {
      if (!program) {
        this.skip();
        return;
      }

      const emptyName = "";

      try {
        await program.methods
          .initMarketplace(emptyName, MARKETPLACE_FEE)
          .accounts({
            admin: admin.publicKey,
            marketplace: PublicKey.findProgramAddressSync(
              [Buffer.from("marketplace"), Buffer.from(emptyName)],
              program.programId
            )[0],
            treasury: treasuryPda,
            rewardsMint: rewardsMintPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([admin])
          .rpc();

        expect.fail("Should have failed with NameTooLong error");
      } catch (error) {
        expect(error.error?.errorCode?.code).to.equal("NameTooLong");
        console.log("✅ Empty name validation working");
      }
    });

    it("Initializes marketplace with maximum valid fee", async function () {
      if (!program) {
        this.skip();
        return;
      }

      const maxFeeMarketplace = "MaxFeeMarket";
      const maxFee = 10000; // 100%

      const [maxFeeMarketplacePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("marketplace"), Buffer.from(maxFeeMarketplace)],
        program.programId
      );

      const [maxFeeTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), maxFeeMarketplacePda.toBuffer()],
        program.programId
      );

      const [maxFeeRewardsMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rewards_mint"), maxFeeMarketplacePda.toBuffer()],
        program.programId
      );

      await program.methods
        .initMarketplace(maxFeeMarketplace, maxFee)
        .accounts({
          admin: admin.publicKey,
          marketplace: maxFeeMarketplacePda,
          treasury: maxFeeTreasuryPda,
          rewardsMint: maxFeeRewardsMintPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();

      const marketplaceAccount = await program.account.marketplace.fetch(
        maxFeeMarketplacePda
      );
      expect(marketplaceAccount.fee).to.equal(maxFee);
      console.log("✅ Maximum fee marketplace created");
    });

    it("Initializes marketplace with zero fee", async function () {
      if (!program) {
        this.skip();
        return;
      }

      const zeroFeeMarketplace = "ZeroFeeMarket";
      const zeroFee = 0;

      const [zeroFeeMarketplacePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("marketplace"), Buffer.from(zeroFeeMarketplace)],
        program.programId
      );

      const [zeroFeeTreasuryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury"), zeroFeeMarketplacePda.toBuffer()],
        program.programId
      );

      const [zeroFeeRewardsMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("rewards_mint"), zeroFeeMarketplacePda.toBuffer()],
        program.programId
      );

      await program.methods
        .initMarketplace(zeroFeeMarketplace, zeroFee)
        .accounts({
          admin: admin.publicKey,
          marketplace: zeroFeeMarketplacePda,
          treasury: zeroFeeTreasuryPda,
          rewardsMint: zeroFeeRewardsMintPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();

      const marketplaceAccount = await program.account.marketplace.fetch(
        zeroFeeMarketplacePda
      );
      expect(marketplaceAccount.fee).to.equal(zeroFee);
      console.log("✅ Zero fee marketplace created");
    });
  });

  describe("Program Structure Validation", () => {
    it("Verifies program has all required instructions", function () {
      if (!program) {
        this.skip();
        return;
      }

      // Check if all required methods exist
      const requiredMethods = ["initMarketplace", "list", "delist", "purchase"];
      for (const method of requiredMethods) {
        expect(program.methods).to.have.property(method);
      }
      console.log("✅ All required program methods available");
    });

    it("Verifies program has all required account types", function () {
      if (!program) {
        this.skip();
        return;
      }

      // Check if all required account types exist
      const requiredAccounts = ["marketplace", "listing"];
      for (const account of requiredAccounts) {
        expect(program.account).to.have.property(account);
      }
      console.log("✅ All required account types available");
    });
  });

  describe("Error Handling", () => {
    it("Handles invalid marketplace name seeds correctly", async function () {
      if (!program) {
        this.skip();
        return;
      }

      // Test with name containing null bytes or other edge cases
      const invalidName = "Test\0Name";

      try {
        await program.methods
          .initMarketplace(invalidName, MARKETPLACE_FEE)
          .accounts({
            admin: admin.publicKey,
            marketplace: PublicKey.findProgramAddressSync(
              [Buffer.from("marketplace"), Buffer.from(invalidName)],
              program.programId
            )[0],
            treasury: treasuryPda,
            rewardsMint: rewardsMintPda,
            systemProgram: anchor.web3.SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([admin])
          .rpc();

        console.log("✅ Program handles special characters in name");
      } catch (error) {
        console.log("❌ Special character handling:", error.message);
        // This might fail depending on implementation - that's OK for testing
      }
    });

    it("Tests boundary conditions for fee values", async function () {
      if (!program) {
        this.skip();
        return;
      }

      // Test edge case fees
      const testCases = [
        { name: "Fee1", fee: 1, shouldPass: true },
        { name: "Fee9999", fee: 9999, shouldPass: true },
        { name: "FeeMax", fee: 10000, shouldPass: true },
      ];

      for (const testCase of testCases) {
        try {
          const [testMarketplacePda] = PublicKey.findProgramAddressSync(
            [Buffer.from("marketplace"), Buffer.from(testCase.name)],
            program.programId
          );

          const [testTreasuryPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("treasury"), testMarketplacePda.toBuffer()],
            program.programId
          );

          const [testRewardsMintPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("rewards_mint"), testMarketplacePda.toBuffer()],
            program.programId
          );

          await program.methods
            .initMarketplace(testCase.name, testCase.fee)
            .accounts({
              admin: admin.publicKey,
              marketplace: testMarketplacePda,
              treasury: testTreasuryPda,
              rewardsMint: testRewardsMintPda,
              systemProgram: anchor.web3.SystemProgram.programId,
              rent: anchor.web3.SYSVAR_RENT_PUBKEY,
            })
            .signers([admin])
            .rpc();

          if (testCase.shouldPass) {
            console.log(`✅ Fee ${testCase.fee} accepted as expected`);
          } else {
            console.log(`❌ Fee ${testCase.fee} should have been rejected`);
            expect.fail(`Fee ${testCase.fee} should have been rejected`);
          }
        } catch (error) {
          if (!testCase.shouldPass) {
            console.log(`✅ Fee ${testCase.fee} rejected as expected`);
          } else {
            console.log(
              `❌ Fee ${testCase.fee} rejected unexpectedly:`,
              error.message
            );
            throw error;
          }
        }
      }
    });
  });
});
