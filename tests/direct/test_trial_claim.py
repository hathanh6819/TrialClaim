import json
import sys
import pytest

pytestmark = pytest.mark.skipif(
    sys.platform == "win32",
    reason="genlayer-test 0.29.2 cannot allocate v0.3 storage descriptors on Windows (__type_desc__ missing)",
)

CONTRACT="contracts/trial_claim_registry.py"
STUDIO="5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng"
DIRECT="1zr6nqk597d97kg0dyxg0shhrykx5v02zjgnyrajapy4wlqvfvwh"
OWNER="0x1111111111111111111111111111111111111111"
OTHER="0x2222222222222222222222222222222222222222"

@pytest.fixture
def deploy_registry(direct_deploy,tmp_path):
    source=open(CONTRACT,encoding="utf-8").read()
    path=tmp_path/"trial_claim_direct.py"
    path.write_text(source.replace(STUDIO,DIRECT,1),encoding="utf-8")
    def deploy():
        return direct_deploy(str(path))
    return deploy

def study(nct="NCT04280705",outcome_count=1):
    outcomes=[{"measure":f"Time to Recovery {i}" if i else "Time to Recovery","description":"Time until recovery","timeFrame":"Day 1 through Day 29"} for i in range(outcome_count)]
    return {"protocolSection":{"identificationModule":{"nctId":nct,"briefTitle":"Adaptive Trial"},"statusModule":{"overallStatus":"COMPLETED"},"outcomesModule":{"primaryOutcomes":outcomes}},"hasResults":True}

def register(c):
    return c.register_claim("NCT04280705","The primary endpoint measured time to recovery through Day 29.","Public summary")

def mock_review(vm,payload,model):
    vm.mock_web(r".*clinicaltrials\.gov.*NCT04280705.*",{"status":200,"body":json.dumps(payload)})
    vm.mock_llm(r".*registered PRIMARY OUTCOMES.*",json.dumps(model))

def test_register_and_read(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();assert register(c)==1
    claim=json.loads(c.get_claim(1));assert claim["status"]=="PENDING";assert claim["revision"]==1

def test_aligned_assessment_binds_exact_citation(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    mock_review(direct_vm,study(),{"verdict":"ALIGNED","reason_code":"EXACT_SCOPE","cited_primary_outcome":"Time to Recovery"})
    result=json.loads(c.assess_claim(1,1));assert result["verdict"]=="ALIGNED";assert len(result["evidence_sha256"])==64
    claim=json.loads(c.get_claim(1));assert claim["status"]=="REVIEWED";assert claim["revision"]==2
    assert claim["assessment_count"]==1
    assert json.loads(c.get_assessment_at(1,1))==result
    assert json.loads(c.get_latest_assessment(1))==result

def test_wrong_study_identity_fails_closed(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    direct_vm.mock_web(r".*clinicaltrials\.gov.*",{"status":200,"body":json.dumps(study("NCT99999999"))})
    result=json.loads(c.assess_claim(1,1));assert result["verdict"]=="INCONCLUSIVE";assert result["reason_code"]=="STUDY_IDENTITY_MISMATCH"

def test_model_cannot_invent_citation(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    mock_review(direct_vm,study(),{"verdict":"ALIGNED","reason_code":"EXACT_SCOPE","cited_primary_outcome":"Overall survival"})
    result=json.loads(c.assess_claim(1,1));assert result["verdict"]=="INCONCLUSIVE";assert result["reason_code"]=="CITATION_NOT_BOUND"

def test_positive_gate_rejects_inconsistent_reason(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    mock_review(direct_vm,study(),{"verdict":"ALIGNED","reason_code":"OMITS_MATERIAL_SCOPE","cited_primary_outcome":"Time to Recovery"})
    result=json.loads(c.assess_claim(1,1));assert result["reason_code"]=="POSITIVE_GATE_FAILED"

def test_outcome_bound_fails_closed(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    direct_vm.mock_web(r".*clinicaltrials\.gov.*",{"status":200,"body":json.dumps(study(outcome_count=17))})
    result=json.loads(c.assess_claim(1,1));assert result["reason_code"]=="PRIMARY_OUTCOMES_OVER_LIMIT"

def test_stale_revision_rejected(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    with pytest.raises(Exception,match="STALE_REVISION"):c.assess_claim(1,9)

def test_revision_is_append_only_and_owner_only(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    direct_vm.sender=OTHER
    with pytest.raises(Exception,match="ONLY_CLAIM_OWNER"):c.revise_claim(1,1,"A corrected statement that is sufficiently detailed.","Correction")
    direct_vm.sender=OWNER
    assert c.revise_claim(1,1,"A corrected statement that is sufficiently detailed.","Correction")==2
    old=json.loads(c.get_claim(1));new=json.loads(c.get_claim(2));assert old["status"]=="SUPERSEDED";assert old["superseded_by"]==2;assert new["parent_claim_id"]==1

def test_assessment_history_is_append_only(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    mock_review(direct_vm,study(),{"verdict":"PARTIAL","reason_code":"OMITS_MATERIAL_SCOPE","cited_primary_outcome":"Time to Recovery"})
    first=json.loads(c.assess_claim(1,1))
    mock_review(direct_vm,study(),{"verdict":"MISALIGNED","reason_code":"CONTRADICTS_REGISTERED_OUTCOME","cited_primary_outcome":"Time to Recovery"})
    second=json.loads(c.assess_claim(1,2))
    claim=json.loads(c.get_claim(1))
    assert claim["assessment_count"]==2 and claim["revision"]==3
    assert json.loads(c.get_assessment_at(1,1))==first
    assert json.loads(c.get_assessment_at(1,2))==second
    assert json.loads(c.get_latest_assessment(1))==second

def test_superseded_claim_cannot_be_assessed(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry();register(c)
    assert c.revise_claim(1,1,"A corrected claim that now states the registered primary endpoint.","Public correction")==2
    with pytest.raises(Exception,match="CLAIM_SUPERSEDED"):c.assess_claim(1,2)

def test_invalid_nct_rejected(direct_vm,deploy_registry):
    direct_vm.sender=OWNER;c=deploy_registry()
    with pytest.raises(Exception,match="INVALID_NCT_ID"):c.register_claim("../admin","A sufficiently long public statement for review.","Context")
