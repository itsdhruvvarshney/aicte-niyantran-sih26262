from datetime import date, datetime, timedelta, timezone
from sqlalchemy.orm import Session

from .auth import hash_password
from .models import (
    Application,
    DeficiencyCycle,
    EscalationAlert,
    EvcSchedule,
    EvidenceSubmission,
    Jurisdiction,
    NotificationLog,
    Obligation,
    SystemClockState,
    User,
    WorkflowRuleVersion,
)
from .services.audit_engine import append_audit_event, create_anchor_checkpoint


def seed_initial_data(db: Session) -> dict:
    """Idempotently seeds AICTE jurisdictions, role users, APH 2024-27 DAG rules, and realistic demo cases."""
    existing_users = db.query(User).count()
    if existing_users > 0:
        return {"seeded": False, "message": "Database already seeded."}

    now = datetime.now(timezone.utc)

    # 1. Seed System Clock & Configurable Priority Weights (w1=0.40, w2=0.35, w3=0.25)
    clock = SystemClockState(id=1, offset_days=0.0, w_deadline=0.40, w_ageing=0.35, w_blocker=0.25)
    db.add(clock)

    # 2. Seed AICTE Regulation Bureau HQ + 8 Official Regional Jurisdictions
    jurisdictions_data = [
        ("HQ", "AICTE Regulation Bureau Headquarters", "New Delhi", "HQ"),
        ("NRO", "Northern Regional Office (NRO)", "Kanpur", "REGIONAL_OFFICE"),
        ("NWRO", "North-Western Regional Office (NWRO)", "Chandigarh", "REGIONAL_OFFICE"),
        ("WRO", "Western Regional Office (WRO)", "Mumbai", "REGIONAL_OFFICE"),
        ("SWRO", "South-Western Regional Office (SWRO)", "Bengaluru", "REGIONAL_OFFICE"),
        ("SCRO", "South-Central Regional Office (SCRO)", "Hyderabad", "REGIONAL_OFFICE"),
        ("SRO", "Southern Regional Office (SRO)", "Chennai", "REGIONAL_OFFICE"),
        ("ERO", "Eastern Regional Office (ERO)", "Kolkata", "REGIONAL_OFFICE"),
        ("CRO", "Central Regional Office (CRO)", "Bhopal", "REGIONAL_OFFICE"),
    ]
    for code, name, city, otype in jurisdictions_data:
        db.add(Jurisdiction(code=code, name=name, city=city, office_type=otype))
    db.flush()

    # 3. Seed 7 Role-Based Users for Real JWT Quick-Login Switcher
    default_pw = hash_password("aicte2026")
    users_map = {}
    users_seed = [
        ("nodal.abc@abcit.edu.in", "Dr. Arvind Sharma (Nodal Officer - ABC Inst.)", "INSTITUTION", "NRO", 101, "ABC Institute of Technology, Ghaziabad"),
        ("scrutiny.nro@aicte-india.org", "Prof. Rajesh Verma (Scrutiny Committee - NRO)", "SCRUTINY_OFFICER", "NRO", None, None),
        ("evc.nro@aicte-india.org", "Dr. Meenakshi Iyer (EVC Chair - NRO)", "EVC_COMMITTEE", "NRO", None, None),
        ("sac.hq@aicte-india.org", "Justice (Retd.) K.M. Nair (SAC/SHC Committee)", "SAC_SHC_COMMITTEE", "HQ", None, None),
        ("ro.nro@aicte-india.org", "Shri Vikramaditya Singh (Regional Officer - NRO)", "REGIONAL_OFFICER", "NRO", None, None),
        ("authority.hq@aicte-india.org", "Prof. S.K.ulkarni (Competent Authority - HQ)", "COMPETENT_AUTHORITY", "HQ", None, None),
        ("director.rb@aicte-india.org", "Dr. Ananya Deshmukh (Regulation Bureau Director)", "BUREAU_ADMIN", "HQ", None, None),
    ]
    for email, fname, role, jcode, inst_id, inst_name in users_seed:
        u = User(
            email=email,
            full_name=fname,
            role=role,
            jurisdiction_code=jcode,
            institution_id=inst_id,
            institution_name=inst_name,
            password_hash=default_pw,
        )
        db.add(u)
        db.flush()
        users_map[role] = u

    # 4. Seed 4 Official APH 2024-27 Workflow Routes + 1 Draft v2 Rule (for Rule Change Impact Simulator)
    rules_seed = [
        WorkflowRuleVersion(
            rule_code="APH_ROUTE_SCRUTINY_EVC",
            version_num=1,
            application_type="NEW_INSTITUTION",
            route_pattern="SCRUTINY_PLUS_EVC",
            authority_type="STATUTORY_PS_APH",
            sla_policy_label="CONFIGURABLE_SLA_POLICY (Admin Default: 7d/5d/7d)",
            source_citation="PS 26262 Sec A & APH 2024-27 Ch-I / Table 2.3 (Scrutiny + EVC Route)",
            is_active=True,
            status="AUTHORISED",
            stages_dag_json={
                "route_name": "Scrutiny + EVC (New Institution / Major Change)",
                "requires_evc": True,
                "stages": [
                    {"code": "SCRUTINY", "order": 1, "title": "Document Scrutiny / Re-Scrutiny Verification", "assigned_role": "SCRUTINY_OFFICER", "prerequisites": [], "sla_days": 7},
                    {"code": "EVC_QUEUE", "order": 2, "title": "Regional EVC Queue & Committee Scheduling", "assigned_role": "REGIONAL_OFFICER", "prerequisites": ["SCRUTINY"], "sla_days": 5},
                    {"code": "EVC_VISIT", "order": 3, "title": "Expert Visit Committee (EVC) Inspection & Report", "assigned_role": "EVC_COMMITTEE", "prerequisites": ["EVC_QUEUE"], "sla_days": 7},
                    {"code": "COMPETENT_AUTHORITY", "order": 4, "title": "Executive Committee / Competent Authority Decision", "assigned_role": "COMPETENT_AUTHORITY", "prerequisites": ["EVC_VISIT"], "sla_days": 5},
                ],
            },
        ),
        WorkflowRuleVersion(
            rule_code="APH_ROUTE_ONLY_SCRUTINY",
            version_num=1,
            application_type="EXTENSION_OF_APPROVAL",
            route_pattern="ONLY_SCRUTINY",
            authority_type="STATUTORY_PS_APH",
            sla_policy_label="CONFIGURABLE_SLA_POLICY (Admin Default: 5d/3d)",
            source_citation="PS 26262 Sec A & APH 2024-27 Ch-II Table 2.3 (Only Scrutiny Route)",
            is_active=True,
            status="AUTHORISED",
            stages_dag_json={
                "route_name": "Only Scrutiny (Standard Extension of Approval & Intake Verification)",
                "requires_evc": False,
                "stages": [
                    {"code": "SCRUTINY", "order": 1, "title": "Scrutiny Committee Verification", "assigned_role": "SCRUTINY_OFFICER", "prerequisites": [], "sla_days": 5},
                    {"code": "COMPETENT_AUTHORITY", "order": 2, "title": "Competent Authority EoA Sign-Off", "assigned_role": "COMPETENT_AUTHORITY", "prerequisites": ["SCRUTINY"], "sla_days": 3},
                ],
            },
        ),
        WorkflowRuleVersion(
            rule_code="APH_ROUTE_EVC_SAC_SHC",
            version_num=1,
            application_type="DEFICIENCY_APPEAL_SAC",
            route_pattern="EVC_PLUS_SAC_SHC",
            authority_type="STATUTORY_PS_APH",
            sla_policy_label="CONFIGURABLE_SLA_POLICY (Admin Default: 5d/7d/10d/5d)",
            source_citation="PS 26262 Sec A & APH 2024-27 Clause 2.24 (EVC + SAC/SHC Appeal Route)",
            is_active=True,
            status="AUTHORISED",
            stages_dag_json={
                "route_name": "EVC + SAC/SHC (Deficiency Observations & Standing Appellate Hearing)",
                "requires_evc": True,
                "stages": [
                    {"code": "SCRUTINY", "order": 1, "title": "Initial Scrutiny & Deficiency Record", "assigned_role": "SCRUTINY_OFFICER", "prerequisites": [], "sla_days": 5},
                    {"code": "EVC_VISIT", "order": 2, "title": "EVC Inspection & Deficiency Verification", "assigned_role": "EVC_COMMITTEE", "prerequisites": ["SCRUTINY"], "sla_days": 7},
                    {"code": "SAC_SHC", "order": 3, "title": "Standing Hearing / Appellate Committee (SHC/SAC) Review", "assigned_role": "SAC_SHC_COMMITTEE", "prerequisites": ["EVC_VISIT"], "sla_days": 10},
                    {"code": "COMPETENT_AUTHORITY", "order": 4, "title": "Competent Authority Final Appellate Order", "assigned_role": "COMPETENT_AUTHORITY", "prerequisites": ["SAC_SHC"], "sla_days": 5},
                ],
            },
        ),
        WorkflowRuleVersion(
            rule_code="APH_ROUTE_ONLY_EVC",
            version_num=1,
            application_type="CHANGE_OF_SITE_INFRA",
            route_pattern="ONLY_EVC",
            authority_type="STATUTORY_PS_APH",
            sla_policy_label="CONFIGURABLE_SLA_POLICY (Admin Default: 4d/7d/4d)",
            source_citation="PS 26262 Sec A & APH 2024-27 Table 2.3 (Only EVC Infrastructure Route)",
            is_active=True,
            status="AUTHORISED",
            stages_dag_json={
                "route_name": "Only EVC (Direct Infrastructure & Site Verification)",
                "requires_evc": True,
                "stages": [
                    {"code": "EVC_QUEUE", "order": 1, "title": "Direct Regional EVC Queue Placement", "assigned_role": "REGIONAL_OFFICER", "prerequisites": [], "sla_days": 4},
                    {"code": "EVC_VISIT", "order": 2, "title": "Expert Visit Committee Field/Online Verification", "assigned_role": "EVC_COMMITTEE", "prerequisites": ["EVC_QUEUE"], "sla_days": 7},
                    {"code": "COMPETENT_AUTHORITY", "order": 3, "title": "Competent Authority Site Approval Decision", "assigned_role": "COMPETENT_AUTHORITY", "prerequisites": ["EVC_VISIT"], "sla_days": 4},
                ],
            },
        ),
        # Draft v2 Rule for Rule Change Impact Simulator Demo
        WorkflowRuleVersion(
            rule_code="APH_ROUTE_SCRUTINY_EVC",
            version_num=2,
            application_type="NEW_INSTITUTION",
            route_pattern="SCRUTINY_PLUS_EVC",
            authority_type="STATUTORY_PS_APH",
            sla_policy_label="PROPOSED_DRAFT_V2 (Expedited Scrutiny 4d & EVC Queue 3d + SAC Gate)",
            source_citation="Draft APH Amendment 2026-27 v2 (Simulation Preview Mode)",
            is_active=False,
            status="DRAFT",
            stages_dag_json={
                "route_name": "Scrutiny + EVC v2 Draft (Expedited 4d Scrutiny + Mandatory SAC Review)",
                "requires_evc": True,
                "stages": [
                    {"code": "SCRUTINY", "order": 1, "title": "Document Scrutiny Verification (Expedited 4d)", "assigned_role": "SCRUTINY_OFFICER", "prerequisites": [], "sla_days": 4},
                    {"code": "EVC_QUEUE", "order": 2, "title": "Regional EVC Queue & Scheduling (Expedited 3d)", "assigned_role": "REGIONAL_OFFICER", "prerequisites": ["SCRUTINY"], "sla_days": 3},
                    {"code": "EVC_VISIT", "order": 3, "title": "Expert Visit Committee Inspection & Report", "assigned_role": "EVC_COMMITTEE", "prerequisites": ["EVC_QUEUE"], "sla_days": 5},
                    {"code": "SAC_SHC", "order": 4, "title": "Pre-Approval SAC Verification Gate", "assigned_role": "SAC_SHC_COMMITTEE", "prerequisites": ["EVC_VISIT"], "sla_days": 5},
                    {"code": "COMPETENT_AUTHORITY", "order": 5, "title": "Competent Authority Final Sign-Off", "assigned_role": "COMPETENT_AUTHORITY", "prerequisites": ["SAC_SHC"], "sla_days": 4},
                ],
            },
        ),
    ]
    for r in rules_seed:
        db.add(r)
    db.flush()

    rule_map = {r.application_type: r for r in rules_seed if r.is_active}

    # 5. Seed Case 1 (Hero Demo Case): AICTE-2026-NRO-1042 (New Institution -> Scrutiny + EVC)
    r_new = rule_map["NEW_INSTITUTION"]
    case_1042 = Application(
        case_number="AICTE-2026-NRO-1042",
        institution_id=101,
        institution_name="ABC Institute of Technology, Ghaziabad",
        jurisdiction_code="NRO",
        application_type="NEW_INSTITUTION",
        academic_year="2026-27",
        programme_name="B.Tech (AI & Data Science - 120 Intake)",
        rule_version_id=r_new.id,
        current_stage="SCRUTINY",
        overall_status="IN_PROGRESS",
        submitted_at=now - timedelta(days=5),
        last_action_at=now - timedelta(days=2),
    )
    db.add(case_1042)
    db.flush()

    for st in r_new.stages_dag_json["stages"]:
        is_first = st["code"] == "SCRUTINY"
        ob = Obligation(
            application_id=case_1042.id,
            obligation_type="WORKFLOW_STAGE",
            stage_code=st["code"],
            order_index=st["order"],
            title=st["title"],
            assigned_role=st["assigned_role"],
            prerequisite_codes=st["prerequisites"],
            state="UNDER_VERIFICATION" if is_first else "REQUIRED",
            blocker_reason_code="SCRUTINY_REVIEW_PENDING" if is_first else f"AWAITING_PREREQUISITE_{st['prerequisites'][0]}",
            sla_days=st["sla_days"],
            sla_policy_source=r_new.sla_policy_label,
            started_at=(now - timedelta(days=5)) if is_first else None,
            due_at=(now + timedelta(days=2)) if is_first else (now + timedelta(days=5 + st["sla_days"])),
        )
        db.add(ob)

    # Also attach Post-Approval Lease & Undertaking obligations to CASE-1042 so full lifecycle is visible
    ob_undertaking_1042 = Obligation(
        application_id=case_1042.id,
        obligation_type="TIME_BOUND_UNDERTAKING",
        stage_code="UNDERTAKING_PHD_FACULTY",
        order_index=5,
        title="Time-Bound Undertaking: Appoint 4 PhD Cadre Faculty & AICTE 8th Pay Scale Affidavit",
        description="Conditional Undertaking under APH Ch-I: Submit joining reports & PAN/Aadhaar verified faculty roster within 45 days.",
        assigned_role="SCRUTINY_OFFICER",
        prerequisite_codes=["COMPETENT_AUTHORITY"],
        state="REQUIRED",
        blocker_reason_code="REQUIRED_DOC_MISSING",
        sla_days=45,
        sla_policy_source="CONDITIONAL_LOA_UNDERTAKING",
        due_at=now + timedelta(days=45),
        document_type="UNDERTAKING_AFFIDAVIT",
    )
    ob_lease_1042 = Obligation(
        application_id=case_1042.id,
        obligation_type="LEASE_DOCUMENT_VALIDITY",
        stage_code="LEASE_DEED_RENEWAL",
        order_index=6,
        title="Registered Land Lease Deed & Fire Safety NOC Validity Tracker",
        description="Prescribed 30-Year Registered Land Lease & Provisional Fire Safety NOC renewal monitoring.",
        assigned_role="REGIONAL_OFFICER",
        prerequisite_codes=[],
        state="REQUIRED",
        blocker_reason_code="REQUIRED_DOC_MISSING",
        sla_days=55,
        sla_policy_source="PRESCRIBED_DOC_VALIDITY_POLICY (T-90/60/30/7d)",
        due_at=now + timedelta(days=55),
        document_type="LAND_LEASE_DEED",
        document_issue_date=date(2021, 6, 30),
        document_expiry_date=(now + timedelta(days=55)).date(),
    )
    db.add_all([ob_undertaking_1042, ob_lease_1042])

    db.add(
        EvcSchedule(
            application_id=case_1042.id,
            is_new_institution=True,
            queue_status="WAITING_PRELIMINARY_SCRUTINY",
            inspection_mode="ONLINE_APH",
        )
    )

    append_audit_event(
        db,
        actor=users_map["INSTITUTION"],
        action_type="APPLICATION_SUBMITTED_AND_ROUTED",
        application_id=case_1042.id,
        case_number=case_1042.case_number,
        old_state="DRAFT",
        new_state="SCRUTINY",
        reason_code="APH_ROUTE_SCRUTINY_EVC",
        remarks="Application submitted by ABC Institute of Technology; dynamically routed to Scrutiny + EVC track.",
        rule_version_id=r_new.id,
        simulated_now=now - timedelta(days=5),
        auto_anchor=False,
    )

    # 6. Seed Case 2: AICTE-2026-NRO-1048 (Conditional Approved with Uploaded Lease awaiting Officer Verification - Upload != Verified!)
    r_eoa = rule_map["EXTENSION_OF_APPROVAL"]
    case_1048 = Application(
        case_number="AICTE-2026-NRO-1048",
        institution_id=101,
        institution_name="ABC Institute of Technology, Ghaziabad (Existing Campus)",
        jurisdiction_code="NRO",
        application_type="EXTENSION_OF_APPROVAL",
        academic_year="2026-27",
        programme_name="B.Tech CSE & ECE Extension of Approval (EoA)",
        rule_version_id=r_eoa.id,
        current_stage="COMPETENT_AUTHORITY",
        overall_status="CONDITIONAL_APPROVED",
        submitted_at=now - timedelta(days=20),
        last_action_at=now - timedelta(days=1),
        competent_authority_decision_by=users_map["COMPETENT_AUTHORITY"].id,
        competent_authority_decision_at=now - timedelta(days=10),
        decision_order_ref="F.No.AICTE/NRO/EoA/2026-27/1048",
    )
    db.add(case_1048)
    db.flush()

    for st in r_eoa.stages_dag_json["stages"]:
        db.add(
            Obligation(
                application_id=case_1048.id,
                obligation_type="WORKFLOW_STAGE",
                stage_code=st["code"],
                order_index=st["order"],
                title=st["title"],
                assigned_role=st["assigned_role"],
                prerequisite_codes=st["prerequisites"],
                state="VERIFIED",
                blocker_reason_code=None,
                sla_days=st["sla_days"],
                sla_policy_source=r_eoa.sla_policy_label,
                started_at=now - timedelta(days=18),
                due_at=now - timedelta(days=12),
                human_verified_by=users_map["SCRUTINY_OFFICER"].id,
                human_verified_at=now - timedelta(days=14),
                verification_remarks="Verified under APH Ch-II Table 2.3.",
            )
        )

    # Undertaking in SUBMITTED state (demonstrating Upload != Verified!)
    ob_ lease_1048 = Obligation(
        application_id=case_1048.id,
        obligation_type="LEASE_DOCUMENT_VALIDITY",
        stage_code="RENEWED_LEASE_VERIFICATION",
        order_index=3,
        title="Renewed 30-Year Registered Land Lease Deed Verification",
        description="Institution uploaded renewed lease v1; awaiting Regional Officer statutory verification.",
        assigned_role="REGIONAL_OFFICER",
        prerequisite_codes=[],
        state="SUBMITTED",
        blocker_reason_code="EVIDENCE_VERIFICATION_PENDING",
        sla_days=15,
        sla_policy_source="PRESCRIBED_DOC_VALIDITY_POLICY",
        due_at=now + timedelta(days=18),
        document_type="LAND_LEASE_DEED",
        document_issue_date=date(2026, 10, 1),
        document_expiry_date=(now + timedelta(days=18)).date(),
        current_evidence_version=1,
    )
    db.add(ob_lease_1048)
    db.flush()

    db.add(
        EvidenceSubmission(
            obligation_id=ob_lease_1048.id,
            application_id=case_1048.id,
            version_no=1,
            document_category="LAND_LEASE_DEED",
            original_filename="ABC_Renewed_Land_Lease_Deed_2026_v1.pdf",
            vault_storage_path="demo_seed_lease_1048_v1.pdf",
            file_sha256_hash="9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
            file_size_bytes=428500,
            claimed_issue_date=date(2026, 10, 1),
            claimed_expiry_date=date(2056, 9, 30),
            assistive_ocr_expiry_date=date(2056, 9, 30),
            ocr_match_status="EXACT_MATCH",
            uploaded_by_id=users_map["INSTITUTION"].id,
            uploaded_by_name=users_map["INSTITUTION"].full_name,
            uploaded_at=now - timedelta(hours=14),
            verification_decision="PENDING_REVIEW",
            human_confirmed_checkbox=False,
        )
    )

    append_audit_event(
        db,
        actor=users_map["INSTITUTION"],
        action_type="COMPLIANCE_EVIDENCE_SUBMITTED",
        application_id=case_1048.id,
        case_number=case_1048.case_number,
        entity_type="OBLIGATION",
        old_state="REQUIRED",
        new_state="SUBMITTED",
        reason_code="EVIDENCE_UPLOADED_V1",
        remarks="Uploaded ABC_Renewed_Land_Lease_Deed_2026_v1.pdf; status set to SUBMITTED (awaiting human officer verification).",
        rule_version_id=r_eoa.id,
        simulated_now=now - timedelta(hours=14),
        auto_anchor=False,
    )

    # 7. Seed 4 Additional Regional Cases (Overdue EVC Queue, Reverted Deficiency, SAC Appeal, Expired Fire NOC)
    extra_cases_spec = [
        ("AICTE-2026-NRO-1055", 102, " Rohilkhand College of Engineering, Bareilly", "NRO", "NEW_INSTITUTION", "EVC_QUEUE", "IN_PROGRESS", -9, "EVC_SCHEDULING_INCOMPLETE"),
        ("AICTE-2026-WRO-2011", 201, "Sahyadri Technical Campus, Pune", "WRO", "DEFICIENCY_APPEAL_SAC", "SAC_SHC", "REVERTED_DEFICIENT", -12, "INSTITUTION_CLARIFICATION_AWAITED"),
        ("AICTE-2026-SRO-3004", 301, "Kaveri Institute of Technology, Chennai", "SRO", "CHANGE_OF_SITE_INFRA", "EVC_VISIT", "IN_PROGRESS", -6, "EVC_SCHEDULING_INCOMPLETE"),
        ("AICTE-2026-SWRO-4019", 401, "Deccan School of Architecture & Tech, Bengaluru", "SWRO", "EXTENSION_OF_APPROVAL", "SCRUTINY", "IN_PROGRESS", -8, "SCRUTINY_REVIEW_PENDING"),
    ]

    for cnum, iid, iname, jcode, atype, cstage, ostat, days_offset, bcode in extra_cases_spec:
        rule_obj = rule_map[atype]
        app_extra = Application(
            case_number=cnum,
            institution_id=iid,
            institution_name=iname,
            jurisdiction_code=jcode,
            application_type=atype,
            academic_year="2026-27",
            programme_name="B.Tech / M.Tech Integrated Approval",
            rule_version_id=rule_obj.id,
            current_stage=cstage,
            overall_status=ostat,
            submitted_at=now + timedelta(days=days_offset - 5),
            last_action_at=now + timedelta(days=days_offset),
        )
        db.add(app_extra)
        db.flush()

        for st in rule_obj.stages_dag_json["stages"]:
            if st["code"] == cstage:
                st_state = "DEFICIENT" if ostat == "REVERTED_DEFICIENT" else "UNDER_VERIFICATION"
                due_dt = now + timedelta(days=days_offset + 5)  # Already overdue if days_offset < -5
            elif st["order"] < next(x["order"] for x in rule_obj.stages_dag_json["stages"] if x["code"] == cstage):
                st_state = "VERIFIED"
                due_dt = now + timedelta(days=days_offset)
            else:
                st_state = "REQUIRED"
                due_dt = now + timedelta(days=10)

            ob_extra = Obligation(
                application_id=app_extra.id,
                obligation_type="WORKFLOW_STAGE",
                stage_code=st["code"],
                order_index=st["order"],
                title=st["title"],
                assigned_role=st["assigned_role"],
                prerequisite_codes=st["prerequisites"],
                state=st_state,
                blocker_reason_code=bcode if st["code"] == cstage else None,
                sla_days=st["sla_days"],
                sla_policy_source=rule_obj.sla_policy_label,
                started_at=now + timedelta(days=days_offset - 2),
                due_at=due_dt,
            )
            db.add(ob_extra)
            db.flush()

            if cnum == "AICTE-2026-WRO-2011" and st["code"] == cstage:
                db.add(
                    DeficiencyCycle(
                        application_id=app_extra.id,
                        obligation_id=ob_extra.id,
                        cycle_no=1,
                        reverted_from_stage="EVC_VISIT",
                        reverted_to_stage="INSTITUTION_CLARIFICATION",
                        deficiency_code="DEF_BARRIER_FREE_RAMP_AND_LAB_SHORTFALL",
                        officer_observations="EVC reported shortfall in Machine Learning Lab terminals and barrier-free lift certification.",
                        raised_by_id=users_map["EVC_COMMITTEE"].id,
                        raised_by_name=users_map["EVC_COMMITTEE"].full_name,
                        raised_at=now - timedelta(days=4),
                        resolution_status="OPEN_AWAITING_INSTITUTION",
                    )
                )

        if rule_obj.stages_dag_json.get("requires_evc"):
            q_stat = "QUEUED_FOR_SCHEDULING" if cstage == "EVC_QUEUE" else "COMMITTEE_ASSIGNED_SCHEDULED"
            db.add(
                EvcSchedule(
                    application_id=app_extra.id,
                    is_new_institution=(atype == "NEW_INSTITUTION"),
                    queue_status=q_stat,
                    queued_at=now + timedelta(days=days_offset),
                    scheduling_sla_due_at=now + timedelta(days=days_offset + 4),
                    completion_sla_due_at=now + timedelta(days=days_offset + 10),
                    scheduled_visit_date=(now + timedelta(days=3)).date() if q_stat == "COMMITTEE_ASSIGNED_SCHEDULED" else None,
                    committee_chair_ref="EVC-PANEL-2026-A9" if q_stat == "COMMITTEE_ASSIGNED_SCHEDULED" else None,
                )
            )

        append_audit_event(
            db,
            actor=users_map["REGIONAL_OFFICER"],
            action_type="STAGE_ROUTED_AND_MONITORED",
            application_id=app_extra.id,
            case_number=app_extra.case_number,
            old_state="SUBMITTED",
            new_state=cstage,
            reason_code=bcode,
            remarks=f"Seeded operational case {cnum} in stage {cstage} for region {jcode}.",
            rule_version_id=rule_obj.id,
            simulated_now=now + timedelta(days=days_offset),
            auto_anchor=False,
        )

    # Create signed external HMAC anchor checkpoint for all seeded events
    create_anchor_checkpoint(db, anchored_by="INITIAL_GENESIS_SEEDER")
    db.commit()
    return {"seeded": True, "message": "Seeded 9 jurisdictions, 7 role users, 5 APH rule versions, and 6 live cases."}