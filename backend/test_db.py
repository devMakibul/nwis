import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.geological import Field
from app.models.wells import Well
from app.models.operations import DrillingEvent
from app.config import settings

async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    
    async with async_session() as db:
        res = await db.execute(select(Field).where(Field.name == 'Moran'))
        f = res.scalar_one()
        wells = await db.execute(select(Well).where(Well.field_id == f.id))
        w_list = list(wells.scalars())
        print(f"Wells in Moran: {len(w_list)}")
        
        events = await db.execute(select(DrillingEvent).where(DrillingEvent.well_id.in_([w.id for w in w_list])))
        e_list = list(events.scalars())
        print(f"Events in Moran: {len(e_list)}")

asyncio.run(main())
