"""
Database seeder — inserts synthetic petroleum data into the database.
Safe to run multiple times (upsert logic).
"""
import structlog
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from app.database.seed_generator import generate_seed_data
from app.models.geological import Basin, Field, Block, Formation, FormationInterval, Reservoir
from app.models.wells import Well, Wellbore, TrajectorySurvey
from app.models.operations import DrillingEvent, Mitigation, LessonLearned
from app.models.intelligence import RigTelemetry, RiskPrediction

logger = structlog.get_logger(__name__)


def _parse_date(val) -> date | None:
    if not val:
        return None
    if isinstance(val, date):
        return val
    try:
        return date.fromisoformat(val)
    except Exception:
        return None


def _parse_dt(val) -> datetime | None:
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(val)
    except Exception:
        return None


async def is_seeded(session: AsyncSession) -> bool:
    """Check if petroleum data already exists."""
    result = await session.execute(select(func.count()).select_from(Basin))
    count = result.scalar()
    return (count or 0) > 0


async def seed_petroleum_data(session: AsyncSession) -> None:
    """Insert all synthetic petroleum data."""
    if await is_seeded(session):
        logger.info("seed_skip", reason="data already exists")
        return

    logger.info("seeding_start")
    data = generate_seed_data()

    # ── Basins ──
    for b in data["basins"]:
        session.add(Basin(
            id=b["id"], name=b["name"], description=b["description"],
            region=b["region"], state=b["state"], geological_age=b["geological_age"],
        ))
    await session.flush()
    logger.info("seeded_basins", count=len(data["basins"]))

    # ── Fields ──
    for f in data["fields"]:
        session.add(Field(
            id=f["id"], basin_id=f["basin_id"], name=f["name"],
            description=f.get("description"), operator=f.get("operator"),
            latitude=f.get("latitude"), longitude=f.get("longitude"),
            discovery_year=f.get("discovery_year"),
        ))
    await session.flush()
    logger.info("seeded_fields", count=len(data["fields"]))

    # ── Blocks ──
    for b in data["blocks"]:
        session.add(Block(
            id=b["id"], field_id=b["field_id"], name=b["name"],
            contract_type=b.get("contract_type"), operator=b.get("operator"),
        ))
    await session.flush()
    logger.info("seeded_blocks", count=len(data["blocks"]))

    # ── Formations ──
    for f in data["formations"]:
        session.add(Formation(
            id=f["id"], basin_id=f["basin_id"], name=f["name"],
            geological_age=f.get("geological_age"), lithology=f.get("lithology"),
            description=f.get("description"),
        ))
    await session.flush()

    # ── Reservoirs ──
    for r in data["reservoirs"]:
        session.add(Reservoir(
            id=r["id"], formation_id=r["formation_id"], name=r["name"],
            reservoir_type=r.get("reservoir_type"), porosity=r.get("porosity"),
            permeability=r.get("permeability"), pressure=r.get("pressure"),
        ))
    await session.flush()
    logger.info("seeded_formations_reservoirs", formations=len(data["formations"]), reservoirs=len(data["reservoirs"]))

    # ── Wells ──
    for w in data["wells"]:
        session.add(Well(
            id=w["id"], well_name=w["well_name"], well_number=w.get("well_number"),
            field_id=w["field_id"], block_id=w.get("block_id"),
            latitude=w["latitude"], longitude=w["longitude"],
            well_purpose=w["well_purpose"], well_status=w["well_status"],
            production_status=w.get("production_status"),
            trajectory_type=w["trajectory_type"],
            planned_depth=w.get("planned_depth"), total_depth=w.get("total_depth"),
            current_depth=w.get("current_depth"),
            max_inclination=w.get("max_inclination"), max_azimuth=w.get("max_azimuth"),
            max_dogleg_severity=w.get("max_dogleg_severity"),
            spud_date=_parse_date(w.get("spud_date")),
            completion_date=_parse_date(w.get("completion_date")),
            abandonment_date=_parse_date(w.get("abandonment_date")),
            reservoir_type=w.get("reservoir_type"),
            hydrocarbon_type=w.get("hydrocarbon_type"),
        ))
    await session.flush()
    logger.info("seeded_wells", count=len(data["wells"]))

    # ── Wellbores ──
    for wb in data["wellbores"]:
        session.add(Wellbore(
            id=wb["id"], well_id=wb["well_id"], name=wb["name"],
            status=wb.get("status"), trajectory_type=wb.get("trajectory_type"),
            sidetrack_number=wb.get("sidetrack_number"),
            kickoff_depth=wb.get("kickoff_depth"), total_depth=wb.get("total_depth"),
        ))
    await session.flush()

    # ── Trajectory Surveys (batch insert in chunks) ──
    surveys = data["trajectory_surveys"]
    chunk = 500
    for i in range(0, len(surveys), chunk):
        batch = surveys[i:i+chunk]
        session.add_all([
            TrajectorySurvey(
                id=s["id"], wellbore_id=s["wellbore_id"],
                measured_depth=s["measured_depth"], inclination=s["inclination"],
                azimuth=s["azimuth"], true_vertical_depth=s.get("true_vertical_depth"),
                northing=s.get("northing"), easting=s.get("easting"),
                dogleg_severity=s.get("dogleg_severity"),
            ) for s in batch
        ])
        await session.flush()
    logger.info("seeded_surveys", count=len(surveys))

    # ── Formation Intervals ──
    for fi in data["formation_intervals"]:
        session.add(FormationInterval(
            id=fi["id"], well_id=fi["well_id"], formation_id=fi["formation_id"],
            top_depth=fi["top_depth"], bottom_depth=fi["bottom_depth"],
            lithology=fi.get("lithology"), reservoir_quality=fi.get("reservoir_quality"),
        ))
    await session.flush()
    logger.info("seeded_intervals", count=len(data["formation_intervals"]))

    # ── Drilling Events ──
    for ev in data["drilling_events"]:
        session.add(DrillingEvent(
            id=ev["id"], well_id=ev["well_id"], wellbore_id=ev.get("wellbore_id"),
            formation_id=ev.get("formation_id"),
            event_type=ev["event_type"], event_category=ev.get("event_category"),
            severity=ev["severity"],
            start_depth=ev.get("start_depth"), end_depth=ev.get("end_depth"),
            description=ev.get("description"), cause=ev.get("cause"),
            consequence=ev.get("consequence"), npt_hours=ev.get("npt_hours"),
            event_start_time=_parse_dt(ev.get("event_start_time")),
            event_end_time=_parse_dt(ev.get("event_end_time")),
        ))
    await session.flush()
    logger.info("seeded_events", count=len(data["drilling_events"]))

    # ── Mitigations ──
    for m in data["mitigations"]:
        session.add(Mitigation(
            id=m["id"], event_id=m["event_id"],
            action_taken=m["action_taken"], result=m.get("result"),
            effectiveness_score=m.get("effectiveness_score"),
        ))
    await session.flush()

    # ── Lessons Learned ──
    for ll in data["lessons_learned"]:
        session.add(LessonLearned(
            id=ll["id"], event_id=ll.get("event_id"), well_id=ll["well_id"],
            formation_id=ll.get("formation_id"), depth_range=ll.get("depth_range"),
            lesson_text=ll["lesson_text"], recommended_action=ll.get("recommended_action"),
            applicable_conditions=ll.get("applicable_conditions"),
        ))
    await session.flush()
    logger.info("seeded_lessons", count=len(data["lessons_learned"]))

    # ── Telemetry (batch) ──
    telemetry = data["telemetry_samples"]
    for i in range(0, len(telemetry), chunk):
        batch = telemetry[i:i+chunk]
        session.add_all([
            RigTelemetry(
                id=t["id"], well_id=t["well_id"],
                timestamp=_parse_dt(t["timestamp"]),
                measured_depth=t.get("measured_depth"),
                vertical_depth=t.get("vertical_depth"),
                rop=t.get("rop"), wob=t.get("wob"), rpm=t.get("rpm"),
                torque=t.get("torque"),
                standpipe_pressure=t.get("standpipe_pressure"),
                ecd=t.get("ecd"), mud_weight=t.get("mud_weight"),
                flow_rate=t.get("flow_rate"), hook_load=t.get("hook_load"),
                temperature=t.get("temperature"),
            ) for t in batch
        ])
        await session.flush()
    logger.info("seeded_telemetry", count=len(telemetry))

    await session.commit()
    logger.info("seeding_complete")
