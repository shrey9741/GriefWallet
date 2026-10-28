import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from db.database import engine, Base
from models import User, Case, Task, Document
from routers import auth, cases, tasks, ai, documents, timeline

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GriefWallet API",
    description="AI-powered post-death financial asset recovery platform",
    version="1.0.0",
)

# CORS: exact origins only (wildcards like *.vercel.app are not supported here)
origins = [
    o.strip()
    for o in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,https://griefwallet.in,https://www.griefwallet.in",
    ).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(cases.router)
app.include_router(tasks.router)
app.include_router(ai.router)
app.include_router(documents.router)
app.include_router(timeline.router)


@app.get("/")
def root():
    return {"message": "GriefWallet API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}
