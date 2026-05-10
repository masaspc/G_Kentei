from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_usage import router as api_usage_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.me import router as me_router
from app.api.questions import router as questions_router
from app.api.stats import router as stats_router
from app.api.study import router as study_router
from app.config import get_settings

settings = get_settings()

app = FastAPI(title="G検定攻略サイト API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(me_router, prefix="/api")
app.include_router(questions_router, prefix="/api")
app.include_router(study_router, prefix="/api")
app.include_router(api_usage_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
