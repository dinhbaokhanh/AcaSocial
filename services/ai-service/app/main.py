"""AI service: gợi ý tag cho bài đăng.

    uvicorn app.main:app --port 8087
"""
import hmac
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

from app.config import INTERNAL_SERVICE_TOKEN, MODEL_NAME
from app.tagger import PrototypeTagger

state: dict = {}


@asynccontextmanager
async def lifespan(_: FastAPI):
    state["tagger"] = PrototypeTagger.load(SentenceTransformer(MODEL_NAME))
    yield
    state.clear()


app = FastAPI(title="AcaSocial AI Service", lifespan=lifespan)


def require_internal_token(x_internal_token: str = Header(default="")):
    if not INTERNAL_SERVICE_TOKEN or not hmac.compare_digest(x_internal_token, INTERNAL_SERVICE_TOKEN):
        raise HTTPException(status_code=403, detail="Invalid internal service token")


class TagRequest(BaseModel):
    title: str = Field(default="", max_length=300)
    content: str = Field(min_length=1, max_length=20000)


class SuggestedTag(BaseModel):
    slug: str
    name: str
    level: str
    tagId: str | None
    topicId: str | None
    score: float
    source: str


class TagResponse(BaseModel):
    status: Literal["ok", "low_confidence", "off_topic"]
    tags: list[SuggestedTag]
    related: list[SuggestedTag]
    model: str


@app.get("/health")
def health():
    return {"status": "ok" if "tagger" in state else "loading"}


@app.post("/internal/ai/tag", response_model=TagResponse, dependencies=[Depends(require_internal_token)])
def suggest_tags(req: TagRequest):
    tagger: PrototypeTagger = state["tagger"]
    result = tagger.analyze(req.title, req.content)

    def to_dto(s):
        tag = tagger.tags[s.slug]
        return SuggestedTag(slug=s.slug, name=tag["name"], level=tag["level"], tagId=tag["tag_id"],
                            topicId=tag["topic_id"], score=s.score, source=s.source)

    return TagResponse(model=MODEL_NAME, status=result.status, tags=[to_dto(s) for s in result.tags],
                       related=[to_dto(s) for s in result.related])
