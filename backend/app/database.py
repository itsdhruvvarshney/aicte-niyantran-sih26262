import os
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker

DEFAULT_SQLITE_URL = "sqlite:///./aicte_niyantran.db"
ENV_DB_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL)

# Normalize driver name if psycopg v3 is installed
if ENV_DB_URL.startswith("postgresql://"):
    ENV_DB_URL = ENV_DB_URL.replace("postgresql://", "postgresql+psycopg://", 1)


def _build_working_engine(url: str):
    if url.startswith("sqlite"):
        return create_engine(url, connect_args={"check_same_thread": False}, pool_pre_ping=True)
    try:
        eng = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception:
        print("⚠️  PostgreSQL container not running; using local SQLite vault (aicte_niyantran.db).")
        return create_engine(DEFAULT_SQLITE_URL, connect_args={"check_same_thread": False}, pool_pre_ping=True)


engine = _build_working_engine(ENV_DB_URL)

if str(engine.url).startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()