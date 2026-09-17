from __future__ import annotations

import getpass
import json
from dataclasses import replace

from genlayer_py import create_account, create_client, studionet
from genlayer_py.types.transactions import TransactionStatus


CONTRACT = "0xB5fE310B807d99668617790C93f965ed90886aea"
RPC = "https://studio-next.genlayer.com/api"
EXPLORER = "https://explorer-studio-dev.genlayer.com"

STUDIO_NEXT = replace(
    studionet,
    id=61997,
    name="GenLayer Studio Next",
    rpc_urls={"default": {"http": [RPC]}},
    block_explorers={"default": {"name": "GenLayer Studio Dev Explorer", "url": EXPLORER}},
)


def canonical(value) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def checkpoint(condition: bool, label: str) -> None:
    if not condition:
        raise RuntimeError("CHECKPOINT FAILED: " + label)
    print("CHECKPOINT OK: " + label, flush=True)


def signer(label: str, expected_address: str | None = None):
    account = create_account(getpass.getpass(label + " private key: ").strip())
    actual = str(account.address)
    if expected_address and actual.lower() != expected_address.lower():
        raise RuntimeError(f"CHECKPOINT FAILED: {label} key resolves to {actual}, expected {expected_address}")
    print(f"SIGNER {label}={actual}", flush=True)
    return create_client(chain=STUDIO_NEXT, account=account), actual


def read(client, method: str, args=None):
    value = client.read_contract(address=CONTRACT, function_name=method, args=args or [])
    print("READ " + method + "=" + canonical(value), flush=True)
    return value


def write(client, method: str, args):
    tx = client.write_contract(address=CONTRACT, function_name=method, args=args, value=0)
    print("WRITE " + method + " args=" + canonical(args) + " tx=" + str(tx), flush=True)
    receipt = client.wait_for_transaction_receipt(
        tx,
        status=TransactionStatus.FINALIZED,
        interval=3000,
        retries=500,
        full_transaction=False,
    )
    print("FINALIZED " + method + "=" + canonical(receipt), flush=True)
    return str(tx), receipt


def claim(client, claim_id: int) -> dict:
    return json.loads(str(read(client, "get_claim", [claim_id])))


def assessment(client, claim_id: int) -> dict | None:
    raw = str(read(client, "get_latest_assessment", [claim_id]))
    return json.loads(raw) if raw else None
