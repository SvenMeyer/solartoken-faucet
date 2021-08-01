import hre from "hardhat";
import { Artifact } from "hardhat/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import { SolarToken } from "../typechain/SolarToken";
import { Signers } from "../types";
// import { shouldBehaveLikeSolarToken } from "./SolarToken.behavior";

import { expect } from "chai";
const { deployContract } = hre.waffle;

const DECIMALS = 5;

describe("Unit tests", function () {
  before(async function () {
    this.signers = {} as Signers;

    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.user1 = signers[1];
  });

  describe("SolarToken", function () {
    beforeEach(async function () {
      const solarTokenArtifact: Artifact = await hre.artifacts.readArtifact("SolarToken");
      this.solarToken = <SolarToken>await deployContract(this.signers.admin, solarTokenArtifact);
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
  });
});
