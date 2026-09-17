from pathlib import Path

SOURCE=Path("contracts/trial_claim_registry.py").read_text(encoding="utf-8")

def test_authority_and_identity_are_fixed():
    assert 'CTG_API_PREFIX = "https://clinicaltrials.gov/api/v2/studies/"' in SOURCE
    assert 'str(identity.get("nctId", "")).upper() != nct_id' in SOURCE
    assert "SOURCE_UNAVAILABLE_OR_MALFORMED" in SOURCE

def test_consequential_assessment_is_bounded():
    for token in ("MAX_SOURCE_BYTES", "MAX_PRIMARY_OUTCOMES", "CITATION_NOT_BOUND", "POSITIVE_GATE_FAILED", "evidence_sha256"):
        assert token in SOURCE

def test_mechanism_is_append_only_not_execution_gate():
    assert "assessment_history" in SOURCE and "claim_superseded_by" in SOURCE
    assert "consume_authorization" not in SOURCE and "transfer(" not in SOURCE
