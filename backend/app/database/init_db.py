"""
Database initialization: creates extensions, all tables, hypertable, and seeds default data.
Called automatically on application startup.
"""
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.base import engine, Base, AsyncSessionLocal
from app.models.identity import Role, User
from app.utils.auth import hash_password

logger = structlog.get_logger(__name__)

DEFAULT_ROLES = [
    {"id": 1, "name": "Admin", "description": "Full system administration"},
    {"id": 2, "name": "Drilling Engineer", "description": "Operational decision making"},
    {"id": 3, "name": "Management", "description": "Read-only operational overview"},
]

DEFAULT_USERS = [
    {"name": "Admin User",    "email": "admin@nwis.oilindia.in",      "password": "admin123",    "role_id": 1},
    {"name": "Rajesh Kumar",  "email": "engineer@nwis.oilindia.in",   "password": "engineer123", "role_id": 2},
    {"name": "Priya Singh",   "email": "management@nwis.oilindia.in", "password": "mgmt123",     "role_id": 3},
]


async def create_extensions(session: AsyncSession) -> None:
    for ext in ["uuid-ossp", "vector", "timescaledb"]:
        try:
            cascade = " CASCADE" if ext == "timescaledb" else ""
            await session.execute(text(f'CREATE EXTENSION IF NOT EXISTS "{ext}"{cascade}'))
            logger.info("extension_ok", extension=ext)
        except Exception as e:
            logger.warning("extension_skip", extension=ext, error=str(e))
    await session.commit()


async def create_hypertable(session: AsyncSession) -> None:
    """Convert rig_telemetry to TimescaleDB hypertable."""
    try:
        # Drop the existing PK constraint so TimescaleDB can partition on timestamp
        await session.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM timescaledb_information.hypertables
                    WHERE hypertable_name = 'rig_telemetry'
                ) THEN
                    PERFORM create_hypertable(
                        'rig_telemetry', 'timestamp',
                        chunk_time_interval => INTERVAL '7 days',
                        migrate_data => TRUE
                    );
                END IF;
            END $$;
        """))
        await session.commit()
        logger.info("hypertable_created", table="rig_telemetry")
    except Exception as e:
        logger.warning("hypertable_skip", error=str(e))
        await session.rollback()


async def seed_roles(session: AsyncSession) -> None:
    from sqlalchemy import select
    for r in DEFAULT_ROLES:
        if not (await session.execute(select(Role).where(Role.id == r["id"]))).scalar_one_or_none():
            session.add(Role(**r))
    await session.commit()
    logger.info("roles_seeded")


async def seed_users(session: AsyncSession) -> None:
    from sqlalchemy import select
    for u in DEFAULT_USERS:
        if not (await session.execute(select(User).where(User.email == u["email"]))).scalar_one_or_none():
            session.add(User(
                name=u["name"], email=u["email"],
                password_hash=hash_password(u["password"]), role_id=u["role_id"],
            ))
    await session.commit()
    logger.info("users_seeded")


async def init_db() -> None:
    logger.info("db_init_start")

    # Step 1: Create extensions (must be before table creation for pgvector types)
    async with AsyncSessionLocal() as session:
        await create_extensions(session)

    # Step 2: Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("tables_created")

    # Step 3: Create hypertable for telemetry
    async with AsyncSessionLocal() as session:
        await create_hypertable(session)

    # Step 4: Seed reference data
    async with AsyncSessionLocal() as session:
        await seed_roles(session)
        await seed_users(session)

    # Step 5: Seed synthetic petroleum data (if first run)
    from app.database.seeder import seed_petroleum_data
    async with AsyncSessionLocal() as session:
        await seed_petroleum_data(session)

    logger.info("db_init_complete")
