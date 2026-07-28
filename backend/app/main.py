from fastapi import FastAPI

from app.database.database import engine
from app.database.models import Base
from app.auth.auth import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DocMind AI API"
)

app.include_router(auth_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to DocMind AI 🚀"
    }