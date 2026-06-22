from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest import run_ingestion
from retrieval import answer_query


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise DB tables on startup
    from database import init_db
    init_db()
    yield


app = FastAPI(title="Kuzana Brain API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    query: str


class ChatResponse(BaseModel):
    answer: str
    type: str          # "document" | "staff_fallback"
    source_title: str | None = None
    source_doc_id: str | None = None
    staff_name: str | None = None
    staff_email: str | None = None
    staff_domain: str | None = None
    staff_title: str | None = None
    staff_department: str | None = None
    similarity_score: float | None = None


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    return await answer_query(request.query)


@app.post("/ingest")
async def ingest():
    """
    Trigger the ingestion pipeline manually or via Cloud Scheduler weekly cron.
    Cloud Scheduler POSTs to this endpoint with no body.
    """
    result = await run_ingestion()
    return result
