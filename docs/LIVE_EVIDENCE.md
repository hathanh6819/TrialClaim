# Studio Next two-wallet lifecycle evidence

Contract: `0xB5fE310B807d99668617790C93f965ed90886aea`

Network: Studio Next, chain ID `61997`

Owner wallet: `0x1D283b45974B0be9630DFD1deC6A62a9B72B2760`

Outsider/reviewer wallet: `0xf96Cf822F9f4e76956AB9fAAa22B3BdCD7b10aD6`

The lifecycle was executed with `genlayer-js@2.0.0-rc.1`. Every write used a Studio Next fee estimate and reached `FINALIZED` before the next checkpoint.

## Transactions

1. Register claim 1: `0xf345e75b37ac85a545c3646374ab462b8d1f1d86d4ca6b958eba3f3888e43870`
2. Outsider revision rejection: `0x4d8bab1930a17c2bc171340193915b04487a639e8a954dd33984fa719c4c8560`
3. Permissionless assessment of claim 1: `0x038834ed33a1f5be4866cdce29777e5f25bac60b9629f5dec9883d82a448b3b0`
4. Stale revision rejection: `0xe8d7444ac7d1371888e4af77a2a447babb8b0bcc0a2bd00356ab25c5d57dba54`
5. Owner supersession creating claim 2: `0xf6c11c4a21b71192dd17c1ce7c0cba49097849ee3e169a7fe54dd95b94dc103f`
6. Permissionless assessment of claim 2: `0xb1e28974f8bf1183f06f0d1de2a51d0c0c9f606638d9edc6c292e40718fbb522`

## Verified outcomes

- Claim count moved from 0 to 1 only after the owner registration.
- Claim 1 owner exactly matched wallet A and began `PENDING`, revision 1.
- Wallet B's unauthorized revision finalized as a rollback and left the serialized claim snapshot unchanged.
- Wallet B was allowed to assess claim 1. Validators fetched the fixed ClinicalTrials.gov endpoint for `NCT04280705`.
- The finalized assessment was `ALIGNED` / `EXACT_SCOPE`, cited the exact primary outcome `Time to Recovery`, and recorded evidence SHA-256 `607745971f4f4463afc74e6a8be18816d2ac38af4632beb05ac9903a3caab208`.
- Assessment attempt 1 read back exactly from append-only history.
- The owner's stale revision transaction rolled back and left state unchanged.
- The correct owner revision superseded claim 1 and created claim 2 with `parent_claim_id = 1`.
- Claim 1's assessment remained readable after supersession.
- Claim 2 obtained its own independent assessment history and finalized as `ALIGNED`.

This proves the positive path, cross-wallet authorization failure, stale-state defense, evidence identity/digest binding, append-only history and supersession lifecycle on the required network. It does not claim that ClinicalTrials.gov sponsor-submitted records are objective medical truth; the contract decides only whether a statement aligns with the registered primary outcome scope.
