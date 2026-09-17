#!/usr/bin/env node

import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const CONTRACT = "0xB5fE310B807d99668617790C93f965ed90886aea";
const RPC = "https://studio-next.genlayer.com/api";
const NCT_ID = "NCT04280705";
const ALIGNED = "The registered primary endpoint measures time to recovery through Day 29.";
const REVISED = "The study registers time to recovery as a primary outcome measured from Day 1 through Day 29.";

const chain = {
  ...studioDevnet,
  id: 61997,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: [RPC] } },
  blockExplorers: { default: { name: "GenLayer Studio Dev Explorer", url: "https://explorer-studio-dev.genlayer.com" } },
};

const canonical = (value) => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
const checkpoint = (condition, label) => {
  if (!condition) throw new Error(`CHECKPOINT FAILED: ${label}`);
  console.log(`CHECKPOINT OK: ${label}`);
};

function hidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("A TTY is required for hidden key input"));
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Interrupted"));
          return;
        }
        if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };
    process.stdin.on("data", onData);
  });
}

async function getSigner(label) {
  const secret = await hidden(`${label} private key: `);
  const normalized = secret.startsWith("0x") ? secret : `0x${secret}`;
  const account = createAccount(normalized);
  console.log(`SIGNER ${label}=${account.address}`);
  return { account, client: createClient({ chain, account }) };
}

async function read(client, functionName, args = []) {
  const value = await client.readContract({ address: CONTRACT, functionName, args, stateStatus: "finalized" });
  console.log(`READ ${functionName}=${canonical(value)}`);
  return value;
}

async function write(client, account, functionName, args) {
  const estimate = await client.estimateTransactionFees({ leaderTimeunitsAllocation: 200n, validatorTimeunitsAllocation: 400n });
  console.log(`FEE ${functionName}=${canonical({ feeValue: estimate.feeValue, distribution: estimate.distribution })}`);
  const hash = await client.writeContract({
    account,
    address: CONTRACT,
    functionName,
    args,
    value: 0n,
    fees: { distribution: estimate.distribution, feeValue: estimate.feeValue },
  });
  console.log(`WRITE ${functionName} tx=${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", fullTransaction: false, interval: 3000, retries: 500 });
  console.log(`FINALIZED ${functionName}=${canonical(receipt)}`);
  return { hash, receipt };
}

const parseRecord = (value) => JSON.parse(String(value));
const getClaim = async (client, id) => parseRecord(await read(client, "get_claim", [id]));
const getAssessment = async (client, id) => {
  const raw = String(await read(client, "get_latest_assessment", [id]));
  return raw ? JSON.parse(raw) : null;
};

async function main() {
  const owner = await getSigner("Owner wallet");
  const outsider = await getSigner("Outsider wallet");
  checkpoint(owner.account.address.toLowerCase() !== outsider.account.address.toLowerCase(), "two distinct wallets loaded");

  const beforeCount = Number(await read(owner.client, "get_claim_count"));
  const txs = {};
  txs.register = (await write(owner.client, owner.account, "register_claim", [NCT_ID, ALIGNED, "Registered outcome summary"])).hash;
  const claimId = Number(await read(owner.client, "get_claim_count"));
  checkpoint(claimId === beforeCount + 1, "registration appends exactly one claim");
  const pending = await getClaim(owner.client, claimId);
  checkpoint(pending.owner.toLowerCase() === owner.account.address.toLowerCase(), "owner is bound to wallet A");
  checkpoint(pending.status === "PENDING" && Number(pending.revision) === 1, "new claim is PENDING revision 1");

  const snapshot = canonical(pending);
  txs.outsider_revise = (await write(outsider.client, outsider.account, "revise_claim", [claimId, 1, REVISED, "Unauthorized rewrite attempt"])).hash;
  checkpoint(canonical(await getClaim(owner.client, claimId)) === snapshot, "outsider rejection leaves state unchanged");

  txs.assess = (await write(outsider.client, outsider.account, "assess_claim", [claimId, 1])).hash;
  const reviewed = await getClaim(owner.client, claimId);
  const result = await getAssessment(owner.client, claimId);
  checkpoint(["REVIEWED", "NEEDS_REVIEW"].includes(reviewed.status), "assessment reaches a bounded review state");
  checkpoint(Number(reviewed.assessment_count) === 1 && Number(reviewed.revision) === 2, "assessment advances count and revision once");
  checkpoint(result && ["ALIGNED", "PARTIAL", "MISALIGNED", "INCONCLUSIVE"].includes(result.verdict), "verdict belongs to the closed enum");
  if (result.verdict !== "INCONCLUSIVE") {
    checkpoint(result.nct_id === NCT_ID && result.evidence_sha256?.length === 64, "result binds NCT identity and evidence digest");
  }
  const historyOne = JSON.parse(String(await read(owner.client, "get_assessment_at", [claimId, 1])));
  checkpoint(canonical(historyOne) === canonical(result), "attempt 1 is preserved in append-only history");

  txs.stale_revise = (await write(owner.client, owner.account, "revise_claim", [claimId, 1, REVISED, "Stale revision attempt"])).hash;
  checkpoint(canonical(await getClaim(owner.client, claimId)) === canonical(reviewed), "stale revision leaves state unchanged");

  txs.owner_revise = (await write(owner.client, owner.account, "revise_claim", [claimId, 2, REVISED, "Owner correction"])).hash;
  const newId = Number(await read(owner.client, "get_claim_count"));
  const oldClaim = await getClaim(owner.client, claimId);
  const newClaim = await getClaim(owner.client, newId);
  checkpoint(oldClaim.status === "SUPERSEDED" && Number(oldClaim.superseded_by) === newId, "old claim is superseded exactly once");
  checkpoint(Number(newClaim.parent_claim_id) === claimId && newClaim.owner.toLowerCase() === owner.account.address.toLowerCase(), "new claim preserves owner and parent link");
  checkpoint(canonical(JSON.parse(String(await read(owner.client, "get_assessment_at", [claimId, 1])))) === canonical(historyOne), "supersession preserves old history");

  txs.assess_revision = (await write(outsider.client, outsider.account, "assess_claim", [newId, 1])).hash;
  checkpoint(Number((await getClaim(owner.client, newId)).assessment_count) === 1, "revised claim has independent history");
  checkpoint((await getAssessment(owner.client, newId)) !== null, "revised assessment is readable");
  console.log("TWO_WALLET_LIFECYCLE_COMPLETE=" + canonical({ claimId, revisedClaimId: newId, transactions: txs }));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
