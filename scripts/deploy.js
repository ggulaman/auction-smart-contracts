const hre = require("hardhat");

const network = process.env.HARDHAT_NETWORK;
const main = async() => {
    await hre.run('compile');
    const [deployer] = await hre.ethers.getSigners();
    console.log("deployer address:", (await deployer.getAddress()).toString());
    console.log("deployer balance:", (await deployer.getBalance()).toString());

    console.log(`Deploying AuctionFactory SC to ${network} network`);
    const SocialAuctionFactory = await hre.ethers.getContractFactory("AuctionFactory");
    const auctionSC = await SocialAuctionFactory.deploy();
    console.log(`AuctionFactory deployed to the following address ${auctionSC.address}`);
};

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
