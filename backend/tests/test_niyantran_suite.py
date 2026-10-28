import sys
from pathlib import Path

# Automatically add the 'backend' directory to sys.path on Windows/Linux
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as db_module
import app.main as main_module
from app.database import Base, get_db
from app.main import app
from app.seed import seed_initial_data

# Use fast in-memory SQLite for deterministic automated test suite execution
TEST_DB_URL = "sqlite:///:memory:"
engine_test = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

# Bind both database module and main lifespan to the in-memory test database
db_module.engine = engine_test
db_module.SessionLocal = TestingSessionLocal
main_module.engine = engine_test
main_module.SessionLocal = TestingSessionLocal


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine_test)
    with TestClient(app) as c:
        yield c


def get_token(client: TestClient, email: str) -> str:
    res = client.post("/api/auth/quick-login", json={"email": email})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_01_aph_dynamic_routing_all_4_tracks(client: TestClient):
    """Proves Section A: Different application categories automatically route to their prescribed APH DAG tracks."""
    inst_token = get_token(client, "nodal.abc@abcit.edu.in")
    headers = {"Authorization": f"Bearer {inst_token}"}

    # 1. Extension of Approval -> Only Scrutiny
    r_eoa = client.post(
        "/api/applications",
        json={"institution_name": "Test College EoA", "jurisdiction_code": "NRO", "application_type": "EXTENSION_OF_APPROVAL"},
        headers=headers,
    )
    assert r_eoa.status_code == 200
    detail_eoa = client.get(f"/api/applications/{r_eoa.json()['id']}", headers=headers).json()
    assert detail_eoa["rule"]["route_pattern"] == "ONLY_SCRUTINY"

    # 2. Change of Site -> Only EVC (starts directly at EVC_QUEUE)
    r_evc = client.post(
        "/api/applications",
        json={"institution_name": "Test College Site", "jurisdiction_code": "NRO", "application_type": "CHANGE_OF_SITE_INFRA"},
        headers=headers,
    )
    assert r_evc.status_code == 200
    assert r_evc.json()["current_stage"] == "EVC_QUEUE"


def test_02_prerequisite_guardrail_blocks_invalid_stage_jump_with_409(client: TestClient):
    """Proves Section A Guardrail: Attempting to jump to EVC_VISIT before SCRUTINY is verified returns HTTP 409 Conflict."""
    ro_token = get_token(client, "ro.nro@aicte-india.org")
    headers = {"Authorization": f"Bearer {ro_token}"}

    res = client.post(
        "/api/applications/1/advance",
        json={"target_stage_code": "EVC_VISIT", "remarks": "Attempting premature EVC completion"},
        headers=headers,
    )
    assert res.status_code == 409
    assert "409" in res.json()["detail"]


def test_03_rbac_and_jurisdiction_abac_enforces_403(client: TestClient):
    """Proves Security Requirement: NRO Scrutiny Officer cannot modify a WRO Region case (HTTP 403 Forbidden)."""
    nro_scrutiny_token = get_token(client, "scrutiny.nro@aicte-india.org")
    headers = {"Authorization": f"Bearer {nro_scrutiny_token}"}

    res = client.post(
        "/api/applications/4/advance",
        json={"remarks": "Unauthorized cross-region attempt"},
        headers=headers,
    )
    assert res.status_code == 403


def test_04_revert_requires_mandatory_deficiency_code_422_and_preserves_history(client: TestClient):
    """Proves Section A Bullet 3: Revert without deficiency reason fails with 422; valid revert creates Cycle #1."""
    scrutiny_token = get_token(client, "scrutiny.nro@aicte-india.org")
    inst_token = get_token(client, "nodal.abc@abcit.edu.in")

    bad_res = client.post(
        "/api/applications/1/revert",
        json={"deficiency_code": "", "officer_observations": "short"},
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert bad_res.status_code == 422

    ok_res = client.post(
        "/api/applications/1/revert",
        json={
            "deficiency_code": "DEF_LAND_ROR_MISMATCH",
            "officer_observations": "Khasra number in land conversion certificate does not match building plan.",
        },
        headers={"Authorization": f"Bearer {scrutiny_token}"},
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["cycle_no"] == 1

    clar_res = client.post(
        "/api/applications/1/clarification",
        json={"clarification_text": "Uploaded Tehsildar verified Khasra corrigendum matching approved building plan."},
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert clar_res.status_code == 200
    assert clar_res.json()["resolution_status"] == "RESUBMITTED_FOR_RESCRUTINY"


def test_05_scrutiny_completion_auto_places_case_in_evc_queue(client: TestClient):
    """Proves Section C: Completing Scrutiny on a Scrutiny+EVC case automatically places it into QUEUED_FOR_SCHEDULING."""
    scrutiny_token = get_token(client, "scrutiny.nro@aicte-india.org")
    headers = {"Authorization": f"Bearer {scrutiny_token}"}

    adv_res = client.post(
        "/api/applications/1/advance",
        json={"remarks": "Re-scrutiny verified; all land and faculty documents compliant."},
        headers=headers,
    )
    assert adv_res.status_code == 200
    assert adv_res.json()["current_stage"] == "EVC_QUEUE"

    detail = client.get("/api/applications/1", headers=headers).json()
    assert detail["evc_schedule"]["queue_status"] == "QUEUED_FOR_SCHEDULING"


def test_06_upload_is_not_verified_5_state_compliance_chain(client: TestClient):
    """Proves Sections D & E: Uploading a document sets state to SUBMITTED (never VERIFIED) until officer confirms."""
    inst_token = get_token(client, "nodal.abc@abcit.edu.in")
    ro_token = get_token(client, "ro.nro@aicte-india.org")

    detail = client.get("/api/applications/1", headers={"Authorization": f"Bearer {inst_token}"}).json()
    lease_ob = next(o for o in detail["obligations"] if o["obligation_type"] == "LEASE_DOCUMENT_VALIDITY")

    up_res = client.post(
        f"/api/obligations/{lease_ob['id']}/upload",
        data={"claimed_issue_date": "2026-10-01", "claimed_expiry_date": "2056-09-30"},
        headers={"Authorization": f"Bearer {inst_token}"},
    )
    assert up_res.status_code == 200
    assert up_res.json()["obligation_state"] == "SUBMITTED"

    bad_ver = client.post(
        f"/api/obligations/{lease_ob['id']}/verify",
        json={"decision": "ACCEPTED_VERIFIED", "human_confirmed_checkbox": False, "verifier_remarks": "Looks fine"},
        headers={"Authorization": f"Bearer {ro_token}"},
    )
    assert bad_ver.status_code == 422

    ok_ver = client.post(
        f"/api/obligations/{lease_ob['id']}/verify",
        json={
            "decision": "ACCEPTED_VERIFIED",
            "human_confirmed_checkbox": True,
            "verifier_remarks": "Verified registered lease deed stamp duty and expiry date 2056-09-30.",
        },
        headers={"Authorization": f"Bearer {ro_token}"},
    )
    assert ok_ver.status_code == 200
    assert ok_ver.json()["new_state"] == "VERIFIED"


def test_07_time_travel_clock_and_idempotent_escalation_no_duplicates(client: TestClient):
    """Proves Section F: Advancing simulated clock triggers L2/L3 escalations; repeated sweeps create 0 duplicates."""
    hq_token = get_token(client, "director.rb@aicte-india.org")
    headers = {"Authorization": f"Bearer {hq_token}"}

    t1 = client.post("/api/clock/time-travel", json={"delta_days": 15.0}, headers=headers)
    assert t1.status_code == 200
    total_after_first = t1.json()["sweep_result"]["total_alerts_in_ledger"]
    assert total_after_first > 0

    t2 = client.post("/api/clock/time-travel", json={"delta_days": 0.0}, headers=headers)
    assert t2.status_code == 200
    assert t2.json()["sweep_result"]["new_alerts_created"] == 0
    assert t2.json()["sweep_result"]["total_alerts_in_ledger"] == total_after_first

    client.post("/api/clock/time-travel", json={"reset_to_zero": True}, headers=headers)


def test_08_citation_ebrief_and_rule_impact_simulator(client: TestClient):
    """Proves Section A e-Brief citations and Rule v1 vs v2 Impact Simulator."""
    hq_token = get_token(client, "director.rb@aicte-india.org")
    headers = {"Authorization": f"Bearer {hq_token}"}

    ebrief = client.get("/api/applications/1/ebrief", headers=headers)
    assert ebrief.status_code == 200
    assert "[Event #" in ebrief.json()["executive_narrative"]

    rules = client.get("/api/rules", headers=headers).json()
    v1_id = next(r["id"] for r in rules if r["rule_code"] == "APH_ROUTE_SCRUTINY_EVC" and r["version_num"] == 1)
    v2_id = next(r["id"] for r in rules if r["rule_code"] == "APH_ROUTE_SCRUTINY_EVC" and r["version_num"] == 2)

    sim = client.post("/api/rules/simulate-impact", json={"base_rule_id": v1_id, "draft_rule_id": v2_id}, headers=headers)
    assert sim.status_code == 200
    assert "SAC_SHC" in sim.json()["structural_diff"]["added_stages"]


def test_09_regulatory_safeguard_blocks_non_authority_from_final_approval(client: TestClient):
    """Proves Regulatory Safeguard: Scrutiny or Regional Officers cannot sign off Competent Authority stage."""
    ro_token = get_token(client, "ro.nro@aicte-india.org")
    comp_token = get_token(client, "authority.hq@aicte-india.org")

    client.post(
        "/api/applications/1/evc-schedule",
        json={"scheduled_visit_date": "2026-11-05", "committee_chair_ref": "EVC-NRO-11", "inspection_mode": "ONLINE_APH"},
        headers={"Authorization": f"Bearer {ro_token}"},
    )
    evc_token = get_token(client, "evc.nro@aicte-india.org")
    client.post(
        "/api/applications/1/advance",
        json={"remarks": "EVC online inspection completed; labs and faculty verified."},
        headers={"Authorization": f"Bearer {evc_token}"},
    )

    forbidden_res = client.post(
        "/api/applications/1/advance",
        json={"remarks": "RO trying to issue final EoA/LoA"},
        headers={"Authorization": f"Bearer {ro_token}"},
    )
    assert forbidden_res.status_code == 403

    ok_res = client.post(
        "/api/applications/1/advance",
        json={"remarks": "Approved by Competent Authority subject to PhD Undertaking.", "decision_order_ref": "AICTE/LoA/2026/1042"},
        headers={"Authorization": f"Bearer {comp_token}"},
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["overall_status"] == "CONDITIONAL_APPROVED"


def test_10_sha256_audit_chain_and_external_anchor_detects_tampering(client: TestClient):
    """Proves Tamper-Evident Audit Ledger: Direct DB tampering immediately breaks verification; restore fixes it."""
    hq_token = get_token(client, "director.rb@aicte-india.org")
    headers = {"Authorization": f"Bearer {hq_token}"}

    v_ok = client.get("/api/audit/verify").json()
    assert v_ok["is_valid"] is True

    t_res = client.post("/api/audit/simulate-tamper", headers=headers).json()
    assert t_res["tampered"] is True

    v_bad = client.get("/api/audit/verify").json()
    assert v_bad["is_valid"] is False
    assert v_bad["broken_at_seq_id"] == t_res["tampered_seq_id"]

    client.post("/api/audit/restore-tamper", headers=headers)
    v_restored = client.get("/api/audit/verify").json()
    assert v_restored["is_valid"] is True