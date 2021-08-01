// eslint-disable @typescript-eslint/no-explicit-any
import { Fixture } from "ethereum-waffle";

import { Signers } from "./";
import { Greeter } from "../typechain/Greeter";
import { SolarToken } from "../typechain/SolarToken";
import { ERC20Faucet } from "../typechain/ERC20Faucet";

declare module "mocha" {
  export interface Context {
    greeter: Greeter;
    solarToken: SolarToken;
    erc20Faucet: ERC20Faucet;
    loadFixture: <T>(fixture: Fixture<T>) => Promise<T>;
    signers: Signers;
  }
}
