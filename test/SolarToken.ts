import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { SolarToken } from "../typechain/SolarToken";
import { ERC20Faucet } from "../typechain/ERC20Faucet";
import { Signers } from "../types";
// import { shouldBehaveLikeSolarToken } from "./SolarToken.behavior";

import { expect } from "chai";
const { deployContract } = hre.waffle;

const DAYS = 24 * 60 * 60; // 1 Day in Seconds

const DECIMALS = 5;
const TOTAL_MAX_AMOUNT = 10 * 1000 * 1000;
const DAILY_MAX_AMOUNT = 100 * 1000;

/***************************************************
 * HELPER FUNCTIONS
 ***************************************************/

/**
 * @dev helper function to get block.timestamp from hardhat provider
 * @returns block.timestamp in unix epoch time (seconds)
 */
const blockTimestamp = async (): Promise<number> => {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  return (await hre.ethers.provider._getBlock(blockNumber)).timestamp;
};

const consoleLog_timestamp = (_time: number) => {
  console.log("time (sec)  =", _time, " , time (days) =", _time / DAYS);
};

/**
 * @dev helper function for hardhat local blockchain to move time
 * @param timeAmount in seconds blockchain time should move forward
 */
const moveTime = async (timeAmount: number): Promise<number> => {
  console.log("----------------------------------------------------------------------------");
  console.log("Jumping", timeAmount / DAYS, "Days into the future ...");
  await hre.ethers.provider.send("evm_increaseTime", [timeAmount]);
  await hre.ethers.provider.send("evm_mine", []);
  const timeNow = await blockTimestamp();
  consoleLog_timestamp(timeNow);
  console.log("----------------------------------------------------------------------------");
  return timeNow;
};

/**
 * @dev helper function for hardhat local blockchain to move time
 * @param timeAmount in seconds blockchain time should move forward
 */
const setTime = async (time: number): Promise<number> => {
  console.log("----------------------------------------------------------------------------");
  console.log("setTime : Jumping to unix time :", time);
  await hre.ethers.provider.send("evm_setNextBlockTimestamp", [time]);
  await hre.ethers.provider.send("evm_mine", []);
  const timeNow = await blockTimestamp();
  consoleLog_timestamp(timeNow);
  console.log("----------------------------------------------------------------------------");
  return timeNow;
};

describe("Unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.user1 = signers[1];
  });

  describe("SolarToken", function () {
    before(async function () {
      // deploy ERC20 SolarToken
      const solarTokenArtifact: Artifact = await hre.artifacts.readArtifact("SolarToken");
      this.solarToken = <SolarToken>await deployContract(this.signers.admin, solarTokenArtifact);

      // deploy ERC20Faucet
      const erc20FaucetArtifact: Artifact = await hre.artifacts.readArtifact("ERC20Faucet");
      this.erc20Faucet = <ERC20Faucet>(
        await deployContract(this.signers.admin, erc20FaucetArtifact, [this.solarToken.address])
      );
    });

    it("solar token should have 5 decimals", async function () {
      expect(await this.solarToken.decimals()).to.equal(DECIMALS);
    });

    it("admin (=deployer) can send tokens to other account", async function () {
      const amount = "10000" + "0".repeat(DECIMALS);
      await this.solarToken.connect(this.signers.admin).transfer(this.signers.user1.address, amount);
      const balance = await this.solarToken.balanceOf(this.signers.user1.address);
      expect(balance).to.equal(amount);
    });

    it("user can send all tokens to admin (=deployer)", async function () {
      const amount = await this.solarToken.balanceOf(this.signers.user1.address);
      await this.solarToken.connect(this.signers.user1).transfer(this.signers.admin.address, amount);
      expect(await this.solarToken.balanceOf(this.signers.user1.address)).to.equal(0);
    });

    it("admin can enable MINTER_ROLE for ERC20Faucet on SolarToken", async function () {
      const MINTER_ROLE = await this.solarToken.MINTER_ROLE();
      await this.solarToken.connect(this.signers.admin).grantRole(MINTER_ROLE, this.erc20Faucet.address);
      expect(await this.solarToken.hasRole(MINTER_ROLE, this.erc20Faucet.address)).to.equal(true);
    });

    it("user can request DAILY_MAX_AMOUNT/2 of token", async function () {
      // start a new day
      const currentTime = await blockTimestamp();
      console.log("currentTime =", currentTime);
      const nextDay = (Math.floor(currentTime / DAYS) + 1) * DAYS;
      console.log("nextDay     =", nextDay);
      await setTime(nextDay);
      // request 1/2 of DAILY_MAX_AMOUNT
      await this.erc20Faucet.connect(this.signers.user1).requestToken(DAILY_MAX_AMOUNT / 2);
      expect(await this.solarToken.balanceOf(this.signers.user1.address)).to.equal(DAILY_MAX_AMOUNT / 2);
    });

    it("user can request DAILY_MAX_AMOUNT/2 of token again on the same day", async function () {
      await this.erc20Faucet.connect(this.signers.user1).requestToken(DAILY_MAX_AMOUNT / 2);
      expect(await this.solarToken.balanceOf(this.signers.user1.address)).to.equal(DAILY_MAX_AMOUNT);
    });

    it("user can NOT request another DAILY_MAX_AMOUNT/2 of token on the same day", async function () {
      await expect(this.erc20Faucet.connect(this.signers.user1).requestToken(DAILY_MAX_AMOUNT / 2)).to.be.reverted;
    });

    it("user can request DAILY_MAX_AMOUNT of token the next day", async function () {
      // move to next day
      await moveTime(1 * DAYS);
      // request 1/2 of DAILY_MAX_AMOUNT
      await this.erc20Faucet.connect(this.signers.user1).requestToken(DAILY_MAX_AMOUNT);
      expect(await this.solarToken.balanceOf(this.signers.user1.address)).to.equal(DAILY_MAX_AMOUNT * 2);
    });

    it("user can NOT request more than TOTAL_MAX_AMOUNT", async function () {
      // move to next day
      await moveTime(1 * DAYS);
      // request TOTAL_MAX_AMOUNT
      await expect(this.erc20Faucet.connect(this.signers.user1).requestToken(TOTAL_MAX_AMOUNT / 2)).to.be.reverted;
    });
  });
});
