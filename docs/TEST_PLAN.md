# Verification plan

## Local gates

- `genvm-lint contracts/trial_claim_registry.py`
- `python -m pytest -v`
- `npm run lint`
- `npm test`
- `npm run build`

Direct GenVM behavioral tests are included for Linux and the official runner. `genlayer-test 0.29.2` currently cannot allocate v0.3 storage descriptors on Windows (`__type_desc__` is missing before the constructor runs); architecture tests remain active locally and this limitation must not be represented as a contract failure or a passed behavioral suite.

## Reproducible two-wallet Studio Next runner

The live runner prompts for both private keys with hidden input and never stores them:

```powershell
node scripts/run_live_two_wallet_lifecycle.mjs `
  --owner 0xOWNER_ADDRESS `
  --outsider 0xOUTSIDER_ADDRESS
```

Run the remaining adversarial matrix after the positive lifecycle:

```powershell
node scripts/run_live_adversarial_matrix.mjs
```

It verifies superseded-claim rollback, invalid identity rollback, contradictory endpoint handling, deterministic repeat assessment with immutable history, unsupported efficacy language, and fail-closed behavior for a missing authority record.

This runner uses the required `genlayer-js@2.0.0-rc.1` fee-aware Studio Next path. It verifies registration, exact owner binding, unauthorized revision rollback, permissionless assessment, evidence digest/NCT binding, append-only history, stale revision rollback, owner supersession, parent linkage and a separate assessment history for the revised claim. Every write estimates fees, waits for `FINALIZED` and prints its transaction hash.

Read a completed claim without a private key:

```powershell
python scripts/read_live_state.py CLAIM_ID
```

## Studio Next live matrix after deployment

1. Register an `NCT04280705` claim and read `PENDING`, revision 1.
2. Assess the aligned recovery/Day 29 example; require finalized consensus and a byte digest.
3. Register a contradictory endpoint claim; require `MISALIGNED` or safely bounded `PARTIAL`, never fabricated medical conclusions.
4. Test a study without result/outcome evidence and source failure; require `INCONCLUSIVE`.
5. Submit stale revision and unauthorized supersession; require deterministic errors.
6. Revise an assessed claim; verify old claim is `SUPERSEDED`, new claim links its parent, and assessment history remains readable.
7. Configure the production frontend with the exact deployed address, submit one signed write, read it back after reload, and verify its Explorer transaction.
