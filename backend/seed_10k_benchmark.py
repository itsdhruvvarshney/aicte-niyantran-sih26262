import time
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import Application, Base, Jurisdiction, WorkflowRuleVersion

BENCH_DB = "sqlite:///./benchmark_10k.db"


def run_10k_scalability_benchmark():
    engine = create_engine(BENCH_DB)
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    regions = ["NRO", "NWRO", "WRO", "SWRO", "SCRO", "SRO", "ERO", "CRO"]
    for r in regions:
        db.add(Jurisdiction(code=r, name=f"{r} Regional Office", city="City", office_type="REGIONAL_OFFICE"))
    rule = WorkflowRuleVersion(
        rule_code="BENCH_RULE",
        version_num=1,
        application_type="NEW_INSTITUTION",
        route_pattern="SCRUTINY_PLUS_EVC",
        source_citation="APH Table 2.3",
        stages_dag_json={"stages": []},
    )
    db.add(rule)
    db.commit()

    now = datetime.now(timezone.utc)
    stages = ["SCRUTINY", "EVC_QUEUE", "EVC_VISIT", "SAC_SHC", "COMPETENT_AUTHORITY"]
    statuses = ["IN_PROGRESS", "REVERTED_DEFICIENT", "CONDITIONAL_APPROVED"]

    print("Seeding 10,000 synthetic AICTE applications...")
    t0 = time.perf_counter()
    bulk_apps = [
        Application(
            case_number=f"AICTE-BENCH-{i:05d}",
            institution_id=1000 + (i % 2500),
            institution_name=f"Technical Institution #{i}",
            jurisdiction_code=regions[i % len(regions)],
            application_type="NEW_INSTITUTION",
            rule_version_id=rule.id,
            current_stage=stages[i % len(stages)],
            overall_status=statuses[i % len(statuses)],
            submitted_at=now - timedelta(days=i % 30),
            last_action_at=now - timedelta(days=i % 15),
        )
        for i in range(1, 10001)
    ]
    db.bulk_save_objects(bulk_apps)
    db.commit()
    insert_ms = (time.perf_counter() - t0) * 1000.0

    t1 = time.perf_counter()
    nro_scrutiny = (
        db.query(Application)
        .filter_by(jurisdiction_code="NRO", current_stage="SCRUTINY", overall_status="IN_PROGRESS")
        .all()
    )
    query_ms = (time.perf_counter() - t1) * 1000.0

    print(f"✅ 10,000 Applications Seeded in: {insert_ms:.1f} ms")
    print(f"✅ Indexed Regional Filter Query (idx_apps_region_stage_status) matched {len(nro_scrutiny)} cases in: {query_ms:.2f} ms")
    db.close()


if __name__ == "__main__":
    run_10k_scalability_benchmark()