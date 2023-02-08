const { expect }  = require('chai');
const hre = require("hardhat");

const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

const auctionDuration = 60 * 60; // 1 hour in seconds
const currentTime = Date.now() / 1000 | 0; // in seconds
const ERC20Name = "AuctionCoin";
const ERC20Symbol = "AC"; 
const ERC20Supply = 10;

describe('Auction Unit Test', function() { 
    before(async () => {
        [owner, signer0, signer1, signer2, signer3, signer4, signer5] = await ethers.getSigners()
        auctionDef = await ethers.getContractFactory('Auction')
        auction = await auctionDef.connect(signer0).deploy(
            owner.getAddress(), auctionDuration, ERC20Name, ERC20Symbol, ERC20Supply
        )
        await auction.deployed()
        auctionSCAddress = auction.address;
        ownerBalance0 = await owner.getBalance();

        AuctionERC20Dev = await ethers.getContractFactory('AuctionERC20');
        ERC20 = await AuctionERC20Dev.attach(
            await auction.connect(signer0).getERC20address() // The deployed contract address
        );
    })

    it('returns ERC20 Smart Contract Address', async () => {
        const ERC20SCAddress = await auction.connect(signer0).getERC20address();
        expect(ERC20SCAddress).to.not.be.equal("0x")
    })

    it('returns the Address of the Auction Owner', async () => {
        const ownerAddress = await auction.connect(signer0).getAuctionOwner();
        expect(ownerAddress).to.not.be.equal(owner.getAddress())
    })

    it('returns the deadline of the auction', async () => {
        const returnedAuctionDeadline = await auction.connect(signer0).getAuctionDeadline();
        expect(returnedAuctionDeadline).to.be.greaterThan(currentTime)
    })

    it('prevents owner from staking', async () => {
        const price = 1;
        const amount = 1;
        await expect(auction.connect(owner).auctionBid(price, amount)).to.be.revertedWith("Owner cannot deposit")
    });

    it('allows signer0 to auctionBid', async () => {
        const price = 100;
        const amount = 2;

        await auction.connect(signer0).auctionBid(price, amount);

        const [totalPriceAft, AmountAft] = await auction.connect(signer0).getAmountAndPriceClaimableByBidder(await signer0.getAddress());
        scBalance1 = await auction.provider.getBalance(auctionSCAddress);
        expect(totalPriceAft).to.be.equal(200);
        expect(AmountAft).to.be.equal(2);
    });

    it('calculates the correct price for the Min. Valid Price', async () => {
        await auction.connect(signer2).auctionBid(400, 4);
        await auction.connect(signer4).auctionBid(600, 1);
        await auction.connect(signer5).auctionBid(800, 3);
        await auction.connect(signer3).auctionBid(500, 1);
        await auction.connect(signer1).auctionBid(200, 3);
        await auction.connect(signer5).auctionBid(800, 5);

        const currentMinPrice = await auction.connect(signer0).getCurrentMinPrice();
        expect(currentMinPrice).to.be.equal(500);

        const [totalPriceAft, AmountAft] = await auction.connect(signer3).getAmountAndPriceClaimableByBidder(await signer3.getAddress());
        expect(totalPriceAft).to.be.equal(500);
        expect(AmountAft).to.be.equal(1);
    });


    it('prevents signer3 from claiming after another bidder matches its amount', async () => {
        await auction.connect(signer5).auctionBid(500, 1);
        const currentMinPrice = await auction.connect(signer0).getCurrentMinPrice();
        expect(currentMinPrice).to.be.equal(500);

        const [totalPriceAft, AmountAft] = await auction.connect(signer3).getAmountAndPriceClaimableByBidder(await signer3.getAddress());
        expect(totalPriceAft).to.be.equal(0);
        expect(AmountAft).to.be.equal(0);
    });

    it('raises and error when bidder place a bid for an amount grater than the supply', async () => {
        await expect(auction.connect(signer2).auctionBid(400, ERC20Supply + 1)).to.be.revertedWith("Amount must be lower than supply");
    });

    // it('allows signer1 to auctionBid, and funds are send back to signer0', async () => {
    //     const signer0Balance0 = await signer0.getBalance();
    //     const signer1Balance0 = await signer1.getBalance();
        
    //     await auction.connect(signer1).auctionBid({ value: '20000000000000000000' });

    //     const signer0Balance1 = await signer0.getBalance();
    //     const signer1Balance1 = await signer1.getBalance();

    //     expect(signer0Balance0).to.be.lessThan(signer0Balance1);
    //     expect(signer1Balance0).to.be.greaterThan(signer1Balance1);
    // });

    // it('prevents users from staking a low amount', async () => {
    //     await expect(auction.connect(signer2).auctionBid({ value: '20000000000000000001' })).to.be.revertedWith("Low stake")
    // });

    it('prevents from claiming until the auction is finished', async () => {
        await expect(auction.connect(signer1).claimBid()).to.be.revertedWith("auction is running")
    });

    it('prevents signer3 from claiming, as does not have a winning bid', async () => {
        auctionIsActive0 = await auction.connect(signer1).getIfAuctionIsActive();
        expect(auctionIsActive0).to.be.true;

        await hre.network.provider.send("hardhat_mine", ["0x3e8", "0x3c"]); // mine 1000 blocks with an interval of 1 minute

        await expect(auction.connect(signer3).claimBid()).to.be.revertedWith("not owning any winner bid")
    });

    it('prevents singer5 from claimin, as not sending enough ETH', async () => {
        await expect(auction.connect(signer5).claimBid({ value: '0' })).to.be.revertedWith("ETH not enough")
    });

    it('allows singer5 to claim', async () => {
        await auction.connect(signer5).claimBid({ value: '10000000' });
        signer5ERC20balance = await ERC20.balanceOf(await signer5.getAddress());
        expect(signer5ERC20balance).to.be.equal(8);
    });

    it('prevents singer5 to claim again', async () => {
        await expect(auction.connect(signer5).claimBid({ value: '10000000' })).to.be.revertedWith("bidder already claimed")
    });

    it('prevents signers to bid after the auction finished', async () => {
        await expect(auction.connect(signer5).auctionBid(500, 1)).to.be.revertedWith("auction finished")
    });
})