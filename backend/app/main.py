from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import selectinload

from app.api import routes_auth, routes_collaborations, routes_users, routes_ws
from app.api.skills import set_collaboration_required_skills, set_user_skills
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.models.collaboration import Collaboration
from app.models.user import User


settings = get_settings()


def backfill_normalized_skills() -> None:
    db = SessionLocal()
    try:
        users = db.query(User).options(selectinload(User.skill_records)).all()
        for user in users:
            if not user.skill_records and user.legacy_skills:
                set_user_skills(db, user, user.legacy_skills)

        collaborations = db.query(Collaboration).options(selectinload(Collaboration.required_skill_records)).all()
        for collaboration in collaborations:
            if not collaboration.required_skill_records and collaboration.legacy_required_skills:
                set_collaboration_required_skills(db, collaboration, collaboration.legacy_required_skills)
        db.commit()
    finally:
        db.close()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(routes_auth.router, prefix="/api")
    app.include_router(routes_users.router, prefix="/api")
    app.include_router(routes_collaborations.router, prefix="/api")
    app.include_router(routes_ws.router)

    @app.on_event("startup")
    def on_startup() -> None:
        Base.metadata.create_all(bind=engine)
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(30)"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(120)"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS graduation_year INTEGER"))
            connection.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url VARCHAR(500)"))
            connection.execute(
                text("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE")
            )
            connection.execute(
                text("ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS post_type VARCHAR(80) NOT NULL DEFAULT 'Event'")
            )
            connection.execute(
                text("ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS event_datetime TIMESTAMP WITH TIME ZONE")
            )
            connection.execute(
                text(
                    "ALTER TABLE applications "
                    "ADD COLUMN IF NOT EXISTS offered_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]"
                )
            )
        backfill_normalized_skills()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
