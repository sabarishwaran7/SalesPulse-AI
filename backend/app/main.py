from datetime import datetime
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.core.database import Base, engine, get_db
from backend.app.api.v1 import (
    analytics, conversations, imports, ai_review, actions, reports, settings as app_settings, spendnest
)
from backend.app.models import Conversation, Purpose
from backend.app.services.spendnest_service import SpendNestService

# Initialize database schema tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SalesPulse AI / Revenue Intelligence Inbox REST API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import RedirectResponse

# Include API v1 routers
app.include_router(spendnest.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(conversations.router, prefix=settings.API_V1_STR)
app.include_router(imports.router, prefix=settings.API_V1_STR)
app.include_router(ai_review.router, prefix=settings.API_V1_STR)
app.include_router(actions.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)
app.include_router(app_settings.router, prefix=settings.API_V1_STR)


@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/docs")


@app.on_event("startup")
def startup_event():
    """Ensure database is seeded with SpendNest initial dataset (44 records) if empty."""
    db = next(get_db())
    try:
        if db.query(Conversation).count() == 0:
            SpendNestService.load_initial_batch(db)
    except Exception as e:
        print(f"[Startup Warning] Could not auto-seed SpendNest data: {e}")
    finally:
        db.close()


@app.get("/health", tags=["Health"])
@app.get("/api/v1/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint validating API and database connectivity."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"disconnected: {str(e)}"

    return {
        "status": "healthy" if "disconnected" not in db_status else "degraded",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": db_status,
        "has_groq_api_key": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("your_")),
        "timestamp": datetime.utcnow().isoformat()
    }
