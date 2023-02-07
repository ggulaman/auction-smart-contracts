const { expect }  = require('chai');
const hre = require("hardhat");

const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

const auctionMinBid = new ethers.BigNumber.from('100000000000000000');
const auctionMinPrice = new ethers.BigNumber.from('1000000000000000000');
const auctionDuration = 60 * 60; // 1 hour in seconds
const currentTime = Date.now() / 1000 | 0; // in seconds
const ERC20Name = "AuctionCoin";
const ERC20Symbol = "AC"; 
const ERC20Supply = 21000000;

describe('Auction Unit Test', function() { 
    before(async () => {
        [owner, signer0, signer1, signer2] = await ethers.getSigners()
        auctionDef = await ethers.getContractFactory('Auction')
        auction = await auctionDef.connect(signer0).deploy(
            owner.getAddress(), auctionMinBid, auctionMinPrice, auctionDuration, ERC20Name, ERC20Symbol, ERC20Supply
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

    it('returns the Address of the Auction Winner for now', async () => {
        const winnerAddress = await auction.connect(signer0).getAuctionWinner();
        expect(winnerAddress).to.not.be.equal("0x")
    })

    it('returns the deadline of the auction', async () => {
        const returnedAuctionDeadline = await auction.connect(signer0).getAuctionDeadline();
        expect(returnedAuctionDeadline).to.be.greaterThan(currentTime)
    })

    it('returns the min bid increment amount', async () => {
        const returnedMinIncrement = await auction.connect(signer0).getMinBidIncrement();
        expect(returnedMinIncrement).to.be.equal(auctionMinBid)
    })

    it('returns the starting price', async () => {
        const returnedMinPrice = await auction.connect(signer0).getMinPrice();
        expect(auctionMinPrice).to.be.equal(returnedMinPrice)
    })

    it('returns the current higer bid', async () => {
        const higherBid = await auction.connect(signer0).getCurrentPrice();
        expect(higherBid).to.be.equal(new ethers.BigNumber.from('900000000000000000'))
    })

    it('prevents owner from staking', async () => {
        await expect(auction.connect(owner).auctionBid()).to.be.revertedWith("Owner cannot deposit")
    });

    it('allows signer0 to auctionBid', async () => {
        scBalance0 = await auction.provider.getBalance(auctionSCAddress);
        expect(scBalance0).to.be.equal(new ethers.BigNumber.from('0'));
        await auction.connect(signer0).auctionBid({ value: '10000000000000000000' });
        scBalance1 = await auction.provider.getBalance(auctionSCAddress);
        expect(scBalance1).to.be.greaterThan(scBalance0);
    });

    it('allows signer1 to auctionBid, and funds are send back to signer0', async () => {
        const signer0Balance0 = await signer0.getBalance();
        const signer1Balance0 = await signer1.getBalance();
        
        await auction.connect(signer1).auctionBid({ value: '20000000000000000000' });

        const signer0Balance1 = await signer0.getBalance();
        const signer1Balance1 = await signer1.getBalance();

        expect(signer0Balance0).to.be.lessThan(signer0Balance1);
        expect(signer1Balance0).to.be.greaterThan(signer1Balance1);
    });

    it('prevents users from staking a low amount', async () => {
        await expect(auction.connect(signer2).auctionBid({ value: '20000000000000000001' })).to.be.revertedWith("Low stake")
    });

    it('prevents from claiming until the auction is finished', async () => {
        await expect(auction.connect(signer1).claimBid()).to.be.revertedWith("auction is running")
    });

    it('prevents a user of of claiming the auction until it finishes', async () => {
        await expect(auction.connect(owner).claimBid()).to.be.revertedWith("auction is running")
    });

    it('only allows signer1 to claim, after the auction is inactive', async () => {
        auctionIsActive0 = await auction.connect(signer1).getIfAuctionIsActive();
        expect(auctionIsActive0).to.be.true;
        // mine 1000 blocks with an interval of 1 minute
        await hre.network.provider.send("hardhat_mine", ["0x3e8", "0x3c"]);

        await expect(auction.connect(signer2).claimBid()).to.be.revertedWith("Only owner and winner can claim")
        await auction.connect(signer1).claimBid();

        auctionIsActive1 = auction.connect(signer1).getIfAuctionIsActive();

        auctionIsActive1 = await auction.connect(signer1).getIfAuctionIsActive();
        expect(auctionIsActive1).to.be.false;


        // Confirming the ETH are sent to the owner
        ownerBalance1 = await owner.getBalance();
        expect(ownerBalance1).to.be.greaterThan(ownerBalance0);

        // Confirming the ERC20 are sent to the WINNER
        winnerERC20balance = await ERC20.balanceOf(await signer1.getAddress());
        expect(winnerERC20balance).to.be.equal(21000000);
    });

    it('prevents to stake after the auction is over', async () => {
        await expect(auction.connect(signer2).auctionBid({ value: '30000000000000000000' })).to.be.revertedWith("auction finished");
    });
})