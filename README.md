# Athena

AI knowledge assistant for African professional teams. Ask a question, get an answer from your company docs — or the right person to ask.

Built for 10–200 person teams running on Google Workspace. No new knowledge base to build. No hallucinations.

---

## How it works

1. Point Athena at a Google Drive folder (or drop markdown files in `backend/sample_docs/`)
2. Call `POST /ingest` — docs are chunked, embedded with Gemini, stored in pgvector
3. Your team asks questions in plain English through the chat UI
4. If the answer is in your docs → returns the exact text, source cited
5. If it's not → routes to the right person on your team (name, title, email) from `staff_directory.json`

Zero generative step in the response path. The answer is either a verbatim chunk from your document, or a real person's contact details. Nothing is fabricated.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router) |
| Backend | FastAPI (Python 3.12) |
| Embeddings | Google Gemini `text-embedding-005` (768-dim) |
| Vector store | PostgreSQL 16 + pgvector |
| Chunking | LangChain `MarkdownHeaderTextSplitter` |
| Infra | Cloud Run + Cloud SQL (europe-west1) |

---

## Project structure

```
noc-ava/
├── app/                          # Next.js frontend
│   ├── chat/page.tsx             # Chat UI
│   ├── api/chat/route.ts         # Proxy to FastAPI backend
│   └── components/chat/
│       ├── DocumentCard.tsx      # Source citation card
│       └── StaffCard.tsx         # Staff contact card
├── backend/
│   ├── main.py                   # FastAPI app + CORS
│   ├── retrieval.py              # pgvector search + staff fallback
│   ├── ingest.py                 # Ingestion pipeline (3 modes)
│   ├── database.py               # SQLAlchemy model + init_db
│   ├── staff_directory.json      # Static staff fallback data
│   └── sample_docs/              # Local markdown docs (USE_MOCK=true)
├── .github/workflows/
│   └── deploy-backend.yml        # Auto-deploy to Cloud Run on push to main
└── docker-compose.yml            # Local dev (pgvector + backend)
```

---

## Local development

**Prerequisites:** Docker, Python 3.12+, Node 18+

```bash
# 1. Clone and install frontend deps
pnpm install

# 2. Set up backend env
cp backend/.env.example backend/.env
# Add your GEMINI_API_KEY to backend/.env

# 3. Start the database
docker-compose up db

# 4. Start the backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 5. Trigger ingestion (loads sample_docs/ into pgvector)
curl -X POST http://localhost:8000/ingest

# 6. Start the frontend
pnpm dev
```

Open [http://localhost:3000/chat](http://localhost:3000/chat).

Or start everything together:
```bash
docker-compose up
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | Yes | — | Google Gemini API key |
| `DATABASE_URL` | Yes | `postgresql://athena:athena@db:5432/athena_brain` | PostgreSQL connection string |
| `USE_MOCK` | No | `true` | Load from `sample_docs/` instead of Drive |
| `SIMILARITY_THRESHOLD` | No | `0.75` | Cosine similarity cutoff |
| `PUBLIC_DOC_IDS` | No | `""` | Comma-separated public Google Doc IDs |
| `CORS_ORIGINS` | No | `*` | Comma-separated allowed origins |

### Frontend

| Variable | Description |
|---|---|
| `BACKEND_URL` | FastAPI backend URL (server-side, used in `app/api/chat/route.ts`) |

---

## Ingestion modes

`ingest.py` resolves document source in priority order:

1. **Public Google Docs** — set `PUBLIC_DOC_IDS` to comma-separated doc IDs or URLs. Docs must be shared as "Anyone with the link can view". No auth required.
2. **Local mock files** — `USE_MOCK=true` reads `backend/sample_docs/*.md`. Default for local dev and demo.
3. **Google Drive (service account)** — `USE_MOCK=false` + `DRIVE_FOLDER_ID` + `GOOGLE_SERVICE_ACCOUNT_JSON`. Production path.

Trigger ingestion at any time:
```bash
curl -X POST https://your-backend-url/ingest
```

---

## Production deployment

Backend runs on Cloud Run (europe-west1), database on Cloud SQL for PostgreSQL 16.

Secrets (`GEMINI_API_KEY`, `DATABASE_URL`) are stored in Secret Manager. The Cloud Run service connects to Cloud SQL via Unix socket — no VPC required.

### Deploy manually

```bash
gcloud builds submit backend/ \
  --tag=europe-west1-docker.pkg.dev/mavuno-493709/athena-brain/backend:latest \
  --region=europe-west1

gcloud run deploy athena-brain-backend \
  --image=europe-west1-docker.pkg.dev/mavuno-493709/athena-brain/backend:latest \
  --region=europe-west1 \
  --add-cloudsql-instances=mavuno-493709:europe-west1:athena-brain-db \
  --set-secrets=GEMINI_API_KEY=GEMINI_API_KEY:latest,DATABASE_URL=DATABASE_URL:latest \
  --set-env-vars=USE_MOCK=true \
  --port=8000
```

### CI/CD

`.github/workflows/deploy-backend.yml` triggers on any push to `main` that touches `backend/`. Requires `GCP_SA_KEY` secret set in GitHub repository settings.

---

## Adding your own documents (demo path)

1. Open the Google Doc → Share → "Anyone with the link can view"
2. Copy the doc ID from the URL (`/document/d/DOC_ID/edit`)
3. Add to `backend/.env`:
   ```
   PUBLIC_DOC_IDS=your_doc_id,another_doc_id
   ```
4. Call `POST /ingest`

---

## Staff directory

Edit `backend/staff_directory.json` to add or update team members. No code change needed. The fallback logic matches query keywords against each person's `topics` field and returns name, title, department, and email.

---

## Roadmap

- [ ] Real-time Google Drive sync (replace scheduled ingest)
- [ ] Slack integration — ask questions without leaving Slack
- [ ] Usage analytics — see which questions come up most (gap analysis for docs)
- [ ] Google SSO on the chat UI
- [ ] Microsoft 365 / SharePoint connector
