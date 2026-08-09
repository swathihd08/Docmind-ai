from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database.database import Base, engine
from app.database.models import User
from app.database.document_model import Document
from app.auth.auth import router as auth_router
from app.routes.user import router as user_router
from app.routes.document import router as document_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="DocMind AI API",
    version="1.0.0"
)

# Enable CORS for React frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local React dev server to communicate
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(document_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to DocMind AI 🚀"
    }