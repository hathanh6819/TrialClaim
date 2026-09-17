#!/usr/bin/env python3
"""Read a TrialClaim claim and all of its assessment history without a private key."""

import argparse
import json

from genlayer_py import create_client

from live_common import CONTRACT, STUDIO_NEXT, canonical


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("claim_id", type=int)
    args = parser.parse_args()
    client = create_client(chain=STUDIO_NEXT)
    raw = client.read_contract(address=CONTRACT, function_name="get_claim", args=[args.claim_id])
    value = json.loads(str(raw))
    print("CLAIM=" + canonical(value))
    for attempt in range(1, int(value["assessment_count"]) + 1):
        item = client.read_contract(address=CONTRACT, function_name="get_assessment_at", args=[args.claim_id, attempt])
        print(f"ASSESSMENT_{attempt}=" + canonical(json.loads(str(item))))


if __name__ == "__main__":
    main()
