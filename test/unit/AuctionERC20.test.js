const { expect }  = require('chai');
const hre = require("hardhat");

const chai = require('chai');
const BN = require('bn.js');

// Enable and inject BN dependency
chai.use(require('chai-bn')(BN));

const ERC20Name = "AuctionCoin";
const ERC20Symbol = "AC"; 
const ERC20Supply = 21000000;

describe('AuctionERC20 Unit Test', function() { 
  before(async () => {
    [owner, signer0] = await ethers.getSigners();
    auctionERC20Def = await ethers.getContractFactory('AuctionERC20');
    auctionERC20 = await auctionERC20Def.connect(owner).deploy(ERC20Name, ERC20Symbol, ERC20Supply, await signer0.getAddress());
    await auctionERC20.deployed();
    auctionERC20SCAddress = auctionERC20.address;
  })

  it('sent the whole supply to signer0', async () => {
    signer0Balance = await auctionERC20.balanceOf(await signer0.getAddress());
    ownerBalance = await auctionERC20.balanceOf(await owner.getAddress());
    expect(signer0Balance).to.be.equal(21000000);
    expect(ownerBalance).to.be.equal(0);
  })
})
