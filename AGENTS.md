# AGENTS.md

Guidance for AI coding agents (and humans) working on GriefWallet.

## What this is
GriefWallet helps Indian families recover a deceased person's financial assets. A user creates a case; the app builds a dependency-aware recovery plan (banks, insurance, EPFO, NPS, mutual funds), flags blockers such as a missing PAN, and drafts institution-specific claim letters. Live at https://griefwallet.in.

## Stack
- **Frontend** (`frontend/`): React 18, Vite, Tailwind 3, React Router v6, Axios. Hosted on Vercel.
- **Auth**: Clerk (production instance, custom domain). Email and Google sign-in.
- **Backend** (`backend/`): FastAPI, SQLAlchemy 2, PostgreSQL (Neon). Hosted on Render, Python 3.11.9.
- **AI**: LangGraph pipeline with Groq. Text model via `GROQ_MODEL` (default `openai/gpt-oss-120b`), vision model via `GROQ_VISION_MODEL` (default `qwen/qwen3.8-27b`).

## Layout
```
backend/
  main.py                FastAPI app, CORS from FRONTEND_ORIGINS
  routers/auth.py        Clerk JWT verification (RS256 via JWKS), get_current_user
  routers/cases.py       Case CRUD (ownership checked)
  routers/ai.py          generate-checklist, generate-document, extract-certificate
  agents/                classifier -> planner -> doc_generator -> advisor, certificate.py
  prompts.py             All LLM prompts (nominee_intro builds the relationship sentence in code)
  knowledge_base/        Institution rules the AI must stay within
frontend/src/
  api.js                 Axios client; attaches the Clerk token via setTokenGetter
  pages/                 Login, Dashboard, CreateCase, CaseDetail, Privacy, ...
```

## Rules that must not be broken
1. **Never commit or print secrets.** Clerk secret key, Groq key, database URL and Google client secret live only in Render/Vercel/Clerk settings. Never paste them into code, logs, issues or chat.
2. **Every case route checks ownership** (`Case.user_id == current_user.id`). Keep it that way for new routes.
3. **Verify JWT signatures.** Do not loosen `verify_clerk_token` (issuer, `exp`, `sub`, authorized origin).
4. **AI output is never trusted blindly.** Validate in code, then let the user confirm. Examples: `kinship_violations` for letters, `validate_fields` for certificates.
5. **The relationship wording in letters is built in code** (`nominee_intro`). Do not hand it back to the model; it reversed parent and child before.
6. **Letters must not invent facts**: no processing times that are not in the knowledge base, and no PAN copy listed when PAN is missing.
7. **Certificate images are processed in memory only.** Do not store them without updating the privacy policy and adding private storage.
8. **Model names are environment variables.** Groq retires models; do not hard-code a new one without keeping the override.
9. **Do not show fake data in the UI.** Every number and list must come from the API.

## Configuration (names only)
Backend (Render): `DATABASE_URL`, `CLERK_SECRET_KEY`, `GROQ_API_KEY`, `FRONTEND_ORIGINS`, optional `GROQ_MODEL`, `GROQ_VISION_MODEL`, `PYTHON_VERSION=3.11.9`.
Frontend (Vercel): `VITE_API_URL`, `VITE_CLERK_PUBLISHABLE_KEY`. Vite bakes these at build time, so redeploy after changing them.
`DATABASE_URL` must be the bare URL: no quotes, no `psql` prefix, ending `?sslmode=require`.

## Run locally
```
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
cd frontend && npm install && npm run dev
```

## Conventions
- Small, file-by-file commits with clear messages.
- Test backend changes with FastAPI `TestClient` and a fake LLM; do not call real model APIs in tests.
- Keep prompts in `backend/prompts.py`.
- New AI features need a failure path: the app must still work manually if the AI is down.

## Known gaps
Dashboard still shows a placeholder "Recent Document Activity" list. No automated test suite or evals yet. No role-based access. Certificate upload accepts images only (no PDF).
