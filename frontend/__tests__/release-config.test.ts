import {describe,expect,it} from "vitest";
import packageJson from "../package.json";
import {GENLAYER_CHAIN_ID,GENLAYER_NETWORK} from "../lib/genlayer/network";

describe("Studio Next release configuration",()=>{
  it("pins the required prerelease SDKs",()=>{
    expect(packageJson.dependencies["genlayer-js"]).toBe("2.0.0-rc.1");
    expect(packageJson.dependencies["@genlayer/transaction-kit"]).toBe("0.1.0-rc.2");
    expect(packageJson.dependencies["@genlayer/transaction-kit-react"]).toBe("0.1.0-rc.2");
  });
  it("targets Studio Next",()=>{
    expect(GENLAYER_CHAIN_ID).toBe(61997);
    expect(GENLAYER_NETWORK.rpcUrls).toEqual(["https://studio-next.genlayer.com/api"]);
  });
});
