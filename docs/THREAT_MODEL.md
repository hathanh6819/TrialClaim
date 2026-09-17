# TrialClaim threat model

## Proof boundary

TrialClaim proves alignment with the registered primary-outcome scope of one NCT record. It does not prove medical truth, efficacy, safety, approval, statistical significance, publication accuracy, or sponsor honesty.

## Adversarial controls

| Attack | Control | Safe outcome |
| --- | --- | --- |
| URL or SSRF injection | Caller supplies only strict `NCT` plus eight digits; origin and fields are constants | `INVALID_NCT_ID` |
| Evidence from another study | Returned `nctId` must exactly equal the committed ID | `INCONCLUSIVE / STUDY_IDENTITY_MISMATCH` |
| Incomplete evidence | Missing primary outcomes cannot be positively classified | `PRIMARY_OUTCOMES_MISSING` |
| Unverifiable evidence volume | More than 16 primary outcomes is rejected rather than truncated | `PRIMARY_OUTCOMES_OVER_LIMIT` |
| Oversized or malformed source | 20 KB response cap and guarded parsing | `INCONCLUSIVE` |
| Hallucinated citation | Consequential citation must exactly match a fetched primary-outcome title | `CITATION_NOT_BOUND` |
| Invalid positive verdict | `ALIGNED` requires the exact `EXACT_SCOPE` reason | `POSITIVE_GATE_FAILED` |
| Stale write | Every assessment and revision carries expected revision | `STALE_REVISION` |
| History rewriting | Assessments are keyed by claim and attempt; revisions create a new linked claim | Old record remains auditable |
| Unauthorized correction | Only claim owner may supersede its statement | `ONLY_CLAIM_OWNER` |

## Operational limitation

ClinicalTrials.gov is the authoritative registry origin, but sponsors or responsible parties submit study records. The UI and contract must describe results as registry alignment, never independently proven clinical truth.
