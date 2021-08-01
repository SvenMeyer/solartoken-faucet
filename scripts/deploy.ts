// We require the Hardhat Runtime Environment explicitly here. This is optional but useful for running the
// script in a standalone fashion through `node <script>`. When running the script with `hardhat run <script>`,
// you'll find the Hardhat Runtime Environment's members available in the global scope.

import hre from "hardhat";
import { ethers } from "hardhat";
import "dotenv/config";

import { SolarToken, SolarToken__factory } from "../typechain";

const CONFIRMATION_BLOCKS_WAIT = 10; // actually ~1 minute or 5 blocks should be ok, but let's play it safe

async function main(): Promise<void> {
  let bn: number;
  const solarToken__factory: SolarToken__factory = await ethers.getContractFactory("SolarToken");
  const solarToken: SolarToken = await solarToken__factory.deploy();

  // const solarToken = solarToken__factory.attach("0xd0EF375C120Ea85748b6bfF4B38c0929C2FeB070");

  const tx1 = await solarToken.deployed();
  console.log("deployment address   =", solarToken.address);

  let deployBn = solarToken.deployTransaction.blockNumber;
  console.log("deploy blocknumber   =", deployBn);

  bn = await ethers.provider.getBlockNumber();
  console.log("current block number =", bn);

  if (deployBn === null || deployBn === undefined) deployBn = bn; // i.e. rinkeby does not give us a deployTransaction.blockNumber

  console.log("waiting " + CONFIRMATION_BLOCKS_WAIT + " blocks ...");

  // wait for a few blocks before trying to verify contract on Etherscan
  // const tx2 = await solarToken.deployTransaction.wait(CONFIRMATION_BLOCKS_WAIT); // would be easy but no feedback while waiting
  while (bn - deployBn < CONFIRMATION_BLOCKS_WAIT) {
    console.log(bn + " - need to wait " + (deployBn + CONFIRMATION_BLOCKS_WAIT - bn) + " more blocks ...");
    await new Promise(f => setTimeout(f, 10000));
    bn = await ethers.provider.getBlockNumber();
  }

  // try to verify contract
  if (process.env.ETHERSCAN_API_KEY !== undefined && process.env.ETHERSCAN_API_KEY.length == 34) {
    await hre.run("verify:verify", {
      address: solarToken.address,
      constructorArguments: [],
    });
  } else {
    console.log("Can not verify contract on Etherscan - no ETHERSCAN_API_KEY");
  }
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
