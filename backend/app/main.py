import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_usage import router as api_usage_router
from app.api.auth import router as auth_router
from app.api.bookmarks import router as bookmarks_router
from app.api.chat import router as chat_router
from app.api.exam import router as exam_router
from app.api.export import router as export_router
from app.api.health import router as health_router
from app.api.me import router as me_router
from app.api.notes import router as notes_router
from app.api.notifications import router as notifications_router
from app.api.questions import router as questions_router
from app.api.reference import router as reference_router
from app.api.stats import router as stats_router
from app.api.study import router as study_router
from app.api.terms import router as terms_router
from app.config import get_settings
from app.seed.seeder import seed_reference_articles

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await seed_reference_articles()
    except Exception:
        logger.exception("Failed to seed reference articles")
    yield


app = FastAPI(title="G検定攻略サイト API", version="0.1.0", lifespan=lifespan)


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
app.include_router(terms_router, prefix="/api")
app.include_router(bookmarks_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(exam_router, prefix="/api")
app.include_router(notes_router, prefix="/api")
app.include_router(export_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(reference_router, prefix="/api")
