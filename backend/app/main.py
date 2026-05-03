from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api import routes_auth, routes_collaborations, routes_users, routes_ws
from app.core.config import get_settings
from app.core.database import Base, engine


settings = get_settings()


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

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
