# GriefWallet

> AI-powered post-death financial asset recovery platform for Indian families.

GriefWallet helps grieving families navigate asset recovery across banks, insurance providers, EPFO and pension funds through AI-generated workflows, institution-specific guidance, and automated document generation.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2.28-orange)](https://langchain-ai.github.io/langgraph)

---

## Live Demo

| Service | URL | Status |
|---------|-----|--------|
| Frontend | Coming soon — Vercel | 🔲 Pending |
| Backend API | Coming soon — Render | 🔲 Pending |
| API Docs | Coming soon — /docs | 🔲 Pending |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + Vite + Tailwind CSS |
| Auth | Clerk (Google OAuth + Email) |
| Backend | FastAPI + SQLAlchemy |
| AI Orchestration | LangGraph + Groq (Llama 3.3 70B) |
| Database | SQLite (dev) → PostgreSQL (prod) |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Features

### Core (v1.0)
- AI-generated task workflows per institution (SBI, LIC, EPFO, HDFC)
- Institution-specific document generation — closure letters, claim letters, EPFO cover letters
- Case management with priority-based task tracking
- Blocker detection — flags missing PAN, disputed wills, multi-nominee succession conflicts
- Role-based auth via Clerk — family, institution officer, admin
- Progress timeline per case
- Dark / light mode toggle

### AI Agent Pipeline
```
Case Input
    ↓
Classifier Node     → detects institution types + global flags (rule-based, no LLM)
    ↓
Planner Node        → generates task list with priorities and blockers (LLM)
    ↓
Doc Generator Node  → generates institution-specific formal letters (LLM)
    ↓
Advisor Node        → AI next-step insight for the family (LLM)
```

### Eval Results
- 27/27 checks passing across 3 ground truth scenarios
- Scenario A: Clean case (SBI + LIC, sole nominee) — 8/8
- Scenario B: Multiple nominees + EPFO — 9/9
- Scenario C: PAN missing + disputed will — 10/10

---

## Project Structure

```
GriefWallet/
├── backend/
│   ├── agents/
│   │   ├── state.py          # Shared TypedDict state schema
│   │   ├── classifier.py     # Rule-based institution classifier
│   │   ├── planner.py        # LLM task generation node
│   │   ├── doc_generator.py  # LLM document generation node
│   │   └── advisor.py        # LLM AI insight node
│   ├── knowledge_base/
│   │   ├── sbi.json          # SBI institution knowledge
│   │   ├── lic.json          # LIC institution knowledge
│   │   ├── epfo.json         # EPFO institution knowledge
│   │   └── hdfc.json         # HDFC institution knowledge
│   ├── routers/
│   │   ├── auth.py           # Clerk auth + JWT routes
│   │   ├── cases.py          # Case CRUD routes
│   │   ├── tasks.py          # Task status routes
│   │   ├── ai.py             # AI generation routes
│   │   ├── documents.py      # Document routes
│   │   └── timeline.py       # Timeline routes
│   ├── models/               # SQLAlchemy models
│   ├── services/             # Business logic
│   ├── graph.py              # LangGraph pipeline
│   ├── prompts.py            # All LLM prompts
│   ├── run_eval.py           # Ground truth evaluator
│   └── main.py               # FastAPI app
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx         # Clerk auth with custom UI
    │   │   ├── Dashboard.jsx     # Case list + stats
    │   │   ├── CreateCase.jsx    # 3-step case creation form
    │   │   ├── CaseDetail.jsx    # 3-panel workflow engine
    │   │   ├── Documents.jsx     # Document preview + download
    │   │   └── Timeline.jsx      # Case event timeline
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── ProtectedRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   └── api.js                # Axios instance
    └── public/
```

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- Groq API key (free at console.groq.com)
- Clerk account (free at clerk.com)

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Add GROQ_API_KEY and CLERK_SECRET_KEY to .env

uvicorn main:app --reload
# API running at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Add VITE_CLERK_PUBLISHABLE_KEY to .env

npm run dev
# Running at http://localhost:5173
```

### Run Agent Eval

```bash
cd backend
python run_eval.py --verbose
# Expected: 27/27 checks passing
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login + get JWT |
| GET | /auth/me | Get current user |
| POST | /cases/create | Create new case |
| GET | /cases | List all cases |
| GET | /cases/:id | Get case details |
| GET | /cases/dashboard-stats | Dashboard statistics |
| GET | /tasks/:case_id | Get tasks for case |
| PATCH | /tasks/:task_id | Update task status |
| POST | /ai/generate-checklist | Run AI agent pipeline |
| POST | /ai/generate-insight | Regenerate AI insight |
| GET | /documents/:case_id | Get generated documents |
| GET | /timeline/:case_id | Get case timeline |

---

## Institution Knowledge Base

| Institution | Type | Forms Covered |
|-------------|------|---------------|
| SBI | Bank | Account closure, nominee transfer |
| HDFC | Bank | Nominee claim, succession |
| LIC | Insurance | Form A, Form B, death benefit |
| EPFO | Government | Form 20, Form 10-D, EPS pension |

---

## Roadmap

### v1.0 — Current
- [x] LangGraph 4-node agent pipeline
- [x] FastAPI backend with all routes
- [x] SQLite local database
- [x] Clerk authentication (Google + email)
- [x] Login page
- [x] Dashboard page
- [x] Create Case page
- [ ] Case Detail page (3-panel)
- [ ] Document Generator page
- [ ] Timeline page
- [ ] Role-based dashboards (family, institution, admin)

### v1.1 — Deployment
- [ ] PostgreSQL on Render
- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on Render
- [ ] Environment variables configured
- [ ] CORS configured for production

### v1.2 — Role-based Access
- [ ] Institution officer dashboard
- [ ] Admin analytics dashboard
- [ ] Role assignment via Clerk publicMetadata
- [ ] Scoped API routes per role

### v1.3 — Enhanced AI
- [ ] Pinecone vector DB for semantic institution search
- [ ] More institutions — ICICI, PNB, Max Life, NPS
- [ ] PDF generation and download
- [ ] Email notifications for status updates

### v2.0 — Production
- [ ] DPDP Act 2023 compliance
- [ ] Encrypted PAN/Aadhaar storage
- [ ] Audit logs
- [ ] Multi-language support (Hindi, Tamil, Bengali)
- [ ] Mobile app (React Native)

---

## Changelog

### v0.3.0 — 2026-05-19
- Added Create Case page with 3-step form
- Clerk Google OAuth + email authentication
- Dashboard page with live stats and case cards
- Dark/light mode toggle

### v0.2.0 — 2026-05-14
- FastAPI backend complete — all routes working
- SQLAlchemy models — User, Case, Task, Document
- JWT authentication working
- Full API test suite passing

### v0.1.0 — 2026-05-13
- LangGraph agent foundation
- 27/27 eval checks passing
- Institution knowledge base — SBI, LIC, EPFO, HDFC
- 3 ground truth scenarios documented

---

## Ground Truth Scenarios

| Scenario | Family | Institutions | Complexity | Result |
|----------|--------|--------------|------------|--------|
| A | Sharma family | SBI + LIC | Low — clean nominee | 8/8 ✅ |
| B | Verma family | HDFC + EPFO + MF | Medium — multiple nominees | 9/9 ✅ |
| C | Khan family | SBI + LIC + EPFO + NPS | High — PAN missing + disputed will | 10/10 ✅ |

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit changes (`git commit -m "feat: your feature"`)
4. Push to branch (`git push origin feat/your-feature`)
5. Open a Pull Request

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Author

Built by **Shrey** — [GitHub](https://github.com/shrey9741)

*GriefWallet is dedicated to every family navigating loss — may this make one difficult thing a little easier.*
