# TrialClaim

Studio Next deployment: [`0xB5fE310B807d99668617790C93f965ed90886aea`](https://explorer-studio-dev.genlayer.com/address/0xB5fE310B807d99668617790C93f965ed90886aea)

Verified two-wallet Studio Next lifecycle: [`docs/LIVE_EVIDENCE.md`](docs/LIVE_EVIDENCE.md)  
Verified live adversarial matrix: [`docs/ADVERSARIAL_LIVE_EVIDENCE.md`](docs/ADVERSARIAL_LIVE_EVIDENCE.md)

TrialClaim is a GenLayer registry that compares a public statement with the registered primary outcomes of a ClinicalTrials.gov study. It deliberately does not judge efficacy, safety, approval, statistical significance, or medical advice.

## Proof obligation

The contract establishes only this bounded proposition: **does the submitted statement accurately represent the primary outcome measures, descriptions, and time frames registered for the specified NCT study?**

The NCT identifier is a locator, not user-supplied truth. Validators build a fixed ClinicalTrials.gov API query with a bounded field projection, require one exact study identity, hash the fetched bytes, and semantically compare the statement with the complete projected primary-outcome set.

## Design boundaries

- TrialClaim performs a bounded semantic comparison of natural-language claims against registered primary outcomes.
- It publishes an append-only public alignment assessment with no executor, payment, efficacy, or treatment consequence.
- Claim supersession and repeat snapshot assessment preserve history as the external registry evolves.
- A positive label is limited to registered outcome alignment and cannot imply clinical efficacy or safety.

## State model

`PENDING -> REVIEWED | NEEDS_REVIEW -> reassessment`

An owner may create a revised claim, which marks the earlier claim `SUPERSEDED` and links both records without deleting assessment history.

## Authoritative source

`https://clinicaltrials.gov/api/v2/studies?query.term={NCT_ID}&pageSize=1&format=json&fields=...`

Only identity, title, status, results availability and registered primary outcome fields are fetched. Responses are capped at 20 KB and claims with more than 16 primary outcomes fail closed because the contract will not pretend to verify a truncated or operationally unbounded set.

## Local verification

```bash
genvm-lint contracts/trial_claim_registry.py
python -m pytest -v
```

Run the deployed two-wallet lifecycle on Studio Next (keys are requested through hidden terminal input and are never persisted):

```powershell
node scripts/run_live_two_wallet_lifecycle.mjs
```

The runner checks happy assessment, outsider authorization failure, stale revision rollback, owner-only supersession, parent linkage, evidence binding and append-only history. See `docs/TEST_PLAN.md` for the exact checkpoints.

## Evidence note

ClinicalTrials.gov is operated by the U.S. National Library of Medicine. Study records are submitted by sponsors or responsible parties. TrialClaim verifies alignment with what is registered; it does not convert sponsor-submitted registry content into objective medical truth.
