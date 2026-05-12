# GriefWallet

AI-powered post-death financial asset recovery platform for Indian families.

GriefWallet helps grieving families navigate asset recovery across banks, insurance, EPFO and pension funds through AI-generated workflows, institution-specific guidance and automated document generation.

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy |
| AI Orchestration | LangGraph + Groq (Llama 3.3 70B) |
| Database | SQLite (dev) → PostgreSQL (prod) |
| Deploy | Vercel (frontend) + Render (backend) |

## Features

- AI-generated task workflows per institution (SBI, LIC, EPFO, HDFC)
- Institution-specific document generation (closure letters, claim letters)
- Case management with priority-based task tracking
- Blocker detection — flags missing PAN, disputed wills, legal heir requirements
- JWT authentication
- Progress timeline per case

## Project Structure
GriefWallet/
├── backend/
│   ├── agents/          # LangGraph nodes
│   ├── knowledge_base/  # Institution JSON files
│   ├── routers/         # FastAPI routes
│   ├── models/          # SQLAlchemy models
│   ├── services/        # Business logic
│   ├── graph.py         # LangGraph pipeline
│   └── main.py          # FastAPI app
└── frontend/            # React app (coming soon)

## Status

- [x] LangGraph agent — 27/27 eval checks passing
- [x] FastAPI backend — all routes working
- [x] JWT authentication
- [x] Database models
- [ ] React frontend
- [ ] PostgreSQL migration
- [ ] Deployment

## Local Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Add your GROQ_API_KEY
uvicorn main:app --reload
```

API docs available at `http://localhost:8000/docs`