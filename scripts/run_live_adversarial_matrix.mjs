#!/usr/bin/env node

import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";

const CONTRACT = "0xB5fE310B807d99668617790C93f965ed90886aea";
const chain = {
  ...studioDevnet,
  id: 61997,
  name: "GenLayer Studio Next",
  rpcUrls: { default: { http: ["https://studio-next.genlayer.com/api"] } },
};
const NCT = "NCT04280705";
const canonical = (value) => JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
const ok = (condition, label) => {
  if (!condition) throw new Error(`CHECKPOINT FAILED: ${label}`);
  console.log(`CHECKPOINT OK: ${label}`);
};

function hidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) return reject(new Error("TTY required"));
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    const cleanup = () => { process.stdin.off("data", onData); process.stdin.setRawMode(false); process.stdin.pause(); };
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\u0003") { cleanup(); reject(new Error("Interrupted")); return; }
        if (char === "\r" || char === "\n") { cleanup(); process.stdout.write("\n"); resolve(value.trim()); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1); else value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

async function signer(label) {
  const raw = await hidden(`${label} private key: `);
  const account = createAccount(raw.startsWith("0x") ? raw : `0x${raw}`);
  console.log(`SIGNER ${label}=${account.address}`);
  return { account, client: createClient({ chain, account }) };
}

async function read(client, functionName, args = []) {
  return client.readContract({ address: CONTRACT, functionName, args, stateStatus: "finalized" });
}
const getClaim = async (client, id) => JSON.parse(String(await read(client, "get_claim", [id])));
const getLatest = async (client, id) => JSON.parse(String(await read(client, "get_latest_assessment", [id])));

async function write(client, account, functionName, args) {
  const estimate = await client.estimateTransactionFees({ leaderTimeunitsAllocation: 200n, validatorTimeunitsAllocation: 400n });
  const hash = await client.writeContract({
    account, address: CONTRACT, functionName, args, value: 0n,
    fees: { distribution: estimate.distribution, feeValue: estimate.feeValue },
  });
  console.log(`WRITE ${functionName} tx=${hash}`);
  const receipt = await client.waitForTransactionReceipt({ hash, waitUntil: "finalized", fullTransaction: false, interval: 3000, retries: 500 });
  console.log(`FINALIZED ${functionName} outcome=${receipt?.lifecycle?.outcome || receipt?.result_name || "unknown"} execution=${receipt?.txExecutionResultName || "unknown"}`);
  return { hash, receipt };
}

async function register(owner, nct, statement, context) {
  const before = Number(await read(owner.client, "get_claim_count"));
  const tx = await write(owner.client, owner.account, "register_claim", [nct, statement, context]);
  const after = Number(await read(owner.client, "get_claim_count"));
  ok(after === before + 1, `${context}: registration appended exactly one claim`);
  return { id: after, tx: tx.hash };
}

async function main() {
  const owner = await signer("Owner wallet");
  const reviewer = await signer("Reviewer wallet");
  ok(owner.account.address.toLowerCase() !== reviewer.account.address.toLowerCase(), "adversarial roles use two wallets");
  const txs = {};

  const superseded = canonical(await getClaim(owner.client, 1));
  txs.superseded_assess = (await write(reviewer.client, reviewer.account, "assess_claim", [1, 3])).hash;
  ok(canonical(await getClaim(owner.client, 1)) === superseded, "superseded claim cannot be assessed or mutated");

  const countBeforeInvalid = Number(await read(owner.client, "get_claim_count"));
  txs.invalid_nct = (await write(owner.client, owner.account, "register_claim", ["../admin", "This invalid identity must never create a claim record.", "Invalid identity attack"])).hash;
  ok(Number(await read(owner.client, "get_claim_count")) === countBeforeInvalid, "invalid NCT path traversal input rolls back")

  const conflict = await register(owner, NCT, "The registered primary endpoint was all-cause mortality at 90 days, not time to recovery through Day 29.", "Contradictory endpoint claim");
  txs.register_conflict = conflict.tx;
  txs.assess_conflict = (await write(reviewer.client, reviewer.account, "assess_claim", [conflict.id, 1])).hash;
  const conflictResult = await getLatest(owner.client, conflict.id);
  ok(["MISALIGNED", "PARTIAL"].includes(conflictResult.verdict), "contradictory claim cannot be ALIGNED");
  ok(conflictResult.verdict !== "ALIGNED" && conflictResult.cited_primary_outcome === "Time to Recovery", "conflict remains bound to an exact registered outcome title");

  const firstHistory = JSON.parse(String(await read(owner.client, "get_assessment_at", [conflict.id, 1])));
  txs.reassess_conflict = (await write(reviewer.client, reviewer.account, "assess_claim", [conflict.id, 2])).hash;
  const conflictClaim = await getClaim(owner.client, conflict.id);
  const secondHistory = JSON.parse(String(await read(owner.client, "get_assessment_at", [conflict.id, 2])));
  ok(Number(conflictClaim.assessment_count) === 2 && Number(conflictClaim.revision) === 3, "repeat assessment appends attempt 2 and advances revision")
  ok(canonical(JSON.parse(String(await read(owner.client, "get_assessment_at", [conflict.id, 1])))) === canonical(firstHistory), "repeat assessment cannot overwrite attempt 1");
  ok(secondHistory.verdict !== "ALIGNED", "repeat assessment remains fail-closed against contradictory scope");

  const vague = await register(owner, NCT, "The study was successful and proves the treatment works.", "Unsupported efficacy claim");
  txs.register_vague = vague.tx;
  txs.assess_vague = (await write(reviewer.client, reviewer.account, "assess_claim", [vague.id, 1])).hash;
  const vagueResult = await getLatest(owner.client, vague.id);
  ok(vagueResult.verdict !== "ALIGNED", "unsupported efficacy claim is never ALIGNED to registered outcome scope");

  const missing = await register(owner, "NCT99999999", "The registered primary endpoint measured time to recovery through Day 29.", "Missing authority record");
  txs.register_missing = missing.tx;
  txs.assess_missing = (await write(reviewer.client, reviewer.account, "assess_claim", [missing.id, 1])).hash;
  const missingResult = await getLatest(owner.client, missing.id);
  ok(missingResult.verdict === "INCONCLUSIVE", "missing authority record fails closed as INCONCLUSIVE");
  ok(["SOURCE_UNAVAILABLE_OR_MALFORMED", "STUDY_IDENTITY_MISMATCH", "PRIMARY_OUTCOMES_MISSING"].includes(missingResult.reason_code), "missing source records a bounded failure reason");

  console.log("ADVERSARIAL_MATRIX_COMPLETE=" + canonical({
    conflictClaimId: conflict.id,
    vagueClaimId: vague.id,
    missingClaimId: missing.id,
    conflictVerdict: conflictResult.verdict,
    repeatConflictVerdict: secondHistory.verdict,
    vagueVerdict: vagueResult.verdict,
    missingReason: missingResult.reason_code,
    transactions: txs,
  }));
}

main().catch((error) => { console.error(error?.stack || error); process.exitCode = 1; });
