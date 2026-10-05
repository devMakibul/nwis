from fastapi import APIRouter
from app.api.routes import auth, wells, dashboard, map, documents, assistant, live, reports, analytics, ml

api_router = APIRouter(prefix="/api")
api_router.include_router(auth.router)
api_router.include_router(wells.router)
api_router.include_router(wells.fields_router)
api_router.include_router(wells.basins_router)
api_router.include_router(dashboard.router)
api_router.include_router(map.router)
api_router.include_router(documents.router)
api_router.include_router(assistant.router)
api_router.include_router(live.router)
api_router.include_router(reports.router)
api_router.include_router(analytics.router)
api_router.include_router(ml.router)
