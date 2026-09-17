#!/usr/bin/env python3
"""Run TrialClaim's two-wallet happy, authorization, revision and history lifecycle."""

import argparse
import json

from live_common import assessment, canonical, checkpoint, claim, read, signer, write


NCT_ID = "NCT04280705"
ALIGNED = "The registered primary endpoint measures time to recovery through Day 29."
REVISED = "The study registers time to recovery as a primary outcome measured from Day 1 through Day 29."


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--owner", help="Expected owner wallet address")
    parser.add_argument("--outsider", help="Expected second wallet address")
    args = parser.parse_args()

    owner_client, owner = signer("Owner wallet", args.owner)
    outsider_client, outsider = signer("Outsider wallet", args.outsider)
    checkpoint(owner.lower() != outsider.lower(), "owner and outsider are separate wallets")

    before_count = int(read(owner_client, "get_claim_count"))
    txs = {}
    txs["register"], _ = write(owner_client, "register_claim", [NCT_ID, ALIGNED, "Registered outcome summary"])
    claim_id = int(read(owner_client, "get_claim_count"))
    checkpoint(claim_id == before_count + 1, "registration appends exactly one claim")

    pending = claim(owner_client, claim_id)
    checkpoint(pending["owner"].lower() == owner.lower(), "claim owner equals wallet A")
    checkpoint(pending["status"] == "PENDING" and int(pending["revision"]) == 1, "new claim is PENDING revision 1")

    snapshot = canonical(pending)
    txs["outsider_revise"], outsider_receipt = write(
        outsider_client,
        "revise_claim",
        [claim_id, 1, REVISED, "Unauthorized rewrite attempt"],
    )
    checkpoint(canonical(claim(owner_client, claim_id)) == snapshot, "outsider revision leaves claim unchanged")
    checkpoint(str(outsider_receipt.get("result_name", "")).lower() != "return", "outsider revision is rejected")

    txs["assess"], _ = write(outsider_client, "assess_claim", [claim_id, 1])
    reviewed = claim(owner_client, claim_id)
    result = assessment(owner_client, claim_id)
    checkpoint(reviewed["status"] in ("REVIEWED", "NEEDS_REVIEW"), "assessment reaches a bounded terminal review state")
    checkpoint(int(reviewed["assessment_count"]) == 1 and int(reviewed["revision"]) == 2, "assessment count and revision advance once")
    checkpoint(result is not None and result["verdict"] in ("ALIGNED", "PARTIAL", "MISALIGNED", "INCONCLUSIVE"), "verdict is from the closed enum")
    if result["verdict"] != "INCONCLUSIVE":
        checkpoint(len(result.get("evidence_sha256", "")) == 64, "review publishes the fetched evidence digest")
        checkpoint(result.get("nct_id") == NCT_ID, "assessment is bound to the exact NCT identity")

    history_one = json.loads(str(read(owner_client, "get_assessment_at", [claim_id, 1])))
    checkpoint(history_one == result, "attempt 1 is readable from append-only history")

    txs["stale_revise"], _ = write(owner_client, "revise_claim", [claim_id, 1, REVISED, "Stale revision attempt"])
    checkpoint(canonical(claim(owner_client, claim_id)) == canonical(reviewed), "stale revision cannot mutate reviewed claim")

    txs["owner_revise"], _ = write(owner_client, "revise_claim", [claim_id, 2, REVISED, "Owner correction"])
    new_id = int(read(owner_client, "get_claim_count"))
    old = claim(owner_client, claim_id)
    new = claim(owner_client, new_id)
    checkpoint(old["status"] == "SUPERSEDED" and int(old["superseded_by"]) == new_id, "old claim is superseded exactly once")
    checkpoint(int(new["parent_claim_id"]) == claim_id and new["owner"].lower() == owner.lower(), "new claim links its parent and preserves owner")
    checkpoint(json.loads(str(read(owner_client, "get_assessment_at", [claim_id, 1]))) == history_one, "supersession preserves prior assessment history")

    txs["assess_revision"], _ = write(outsider_client, "assess_claim", [new_id, 1])
    revised_result = assessment(owner_client, new_id)
    revised_claim = claim(owner_client, new_id)
    checkpoint(int(revised_claim["assessment_count"]) == 1, "revised claim has independent assessment history")
    checkpoint(revised_result is not None, "revised assessment is readable")

    print("TWO_WALLET_LIFECYCLE_COMPLETE=" + canonical({"claim_id": claim_id, "revised_claim_id": new_id, "transactions": txs}), flush=True)


if __name__ == "__main__":
    main()
