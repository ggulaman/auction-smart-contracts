const { expect }  = require('chai');
const hre = require("hardhat");

const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

const auctionMinBid = new ethers.BigNumber.from('100000000000000000');
const auctionMinPrice = new ethers.BigNumber.from('1000000000000000000');
const auctionDuration = 60 * 60; // 1 hour in seconds
const ERC20Name = "AuctionCoin";
const ERC20Symbol = "AC"; 
const ERC20Supply = 21000000;

describe('AuctionFactoryUnit Test', function() { 
  before(async () => {
    [owner, signer0] = await ethers.getSigners();
    auctionFactoryDef = await ethers.getContractFactory('AuctionFactory');
    auctionFactory = await auctionFactoryDef.connect(owner).deploy();
    await auctionFactory.deployed();
    auctionFactorySCAddress = auctionFactory.address;
  })

  it('only allows owner to raise auctions', async () => {
    await expect(auctionFactory.connect(signer0).createANewAuction(auctionMinBid, auctionMinPrice, auctionDuration, ERC20Name, ERC20Symbol, ERC20Supply)).to.be.revertedWith("only owner");
  })

  it('allows owner to raise a new auction', async () => {
    const numberOfAuctionsInit = await auctionFactory.connect(owner).getNumberOfAuctions();
    expect(numberOfAuctionsInit).to.be.equal(0);
    await auctionFactory.connect(owner).createANewAuction(auctionMinBid, auctionMinPrice, auctionDuration, ERC20Name, ERC20Symbol, ERC20Supply);
    const numberOfAuctions = await auctionFactory.connect(owner).getNumberOfAuctions();
    expect(numberOfAuctions).to.be.equal(1);
  })
})
