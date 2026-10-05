import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.geological import Field
from app.models.wells import Well
from app.models.events import DrillingEvent

async def test():
    async with AsyncSessionLocal() as db:
        fields = await db.execute(select(Field))
        print("Fields:")
        for f in fields.scalars():
            print(f" - {f.name}")
        
        wells = await db.execute(select(Well))
        print("\nWells:")
        well_list = list(wells.scalars())
        for w in well_list:
            print(f" - {w.well_name} (Field ID: {w.field_id})")

        events = await db.execute(select(DrillingEvent, Well.well_name).join(Well, DrillingEvent.well_id == Well.id))
        print("\nEvents:")
        for ev, wname in events:
            print(f" - {ev.event_type} on {wname}")

asyncio.run(test())
