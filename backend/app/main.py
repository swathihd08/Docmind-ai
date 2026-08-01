from fastapi import FastAPI

from app.database.database import Base, engine
from app.auth.auth import router as auth_router
from app.routes.user import router as user_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DocMind AI API",
    version="1.0.0"
)

app.include_router(auth_router)
app.include_router(user_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to DocMind AI 🚀"
    }