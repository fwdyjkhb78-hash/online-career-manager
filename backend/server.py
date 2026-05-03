from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import httpx
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (kept for optional Mongo utilities)
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# PocketBase upstream (running on same pod)
POCKETBASE_URL = os.environ.get('POCKETBASE_URL', 'http://127.0.0.1:8090')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Shared httpx client for proxy
pb_client = httpx.AsyncClient(base_url=POCKETBASE_URL, timeout=30.0)


# ---- Status (legacy template endpoints) ----
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "Hello World", "pocketbase": POCKETBASE_URL}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    items = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for c in items:
        if isinstance(c.get('timestamp'), str):
            c['timestamp'] = datetime.fromisoformat(c['timestamp'])
    return items


# ---- PocketBase reverse proxy at /api/pb/* ----
# Lets the browser talk to PocketBase through the public ingress.
HOP_HEADERS = {
    "connection",
    "keep-alive",
    "transfer-encoding",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "upgrade",
    "host",
    "content-length",
}


@app.api_route(
    "/api/pb/{path:path}",
    methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"],
)
async def pocketbase_proxy(request: Request, path: str):
    url = f"/{path}"
    if request.url.query:
        url = f"{url}?{request.url.query}"

    headers = {
        k: v for k, v in request.headers.items() if k.lower() not in HOP_HEADERS
    }
    body = await request.body()
    # Ensure content-type is set for POST/PATCH/PUT (Cloudflare-friendly)
    if request.method in ("POST", "PATCH", "PUT") and not any(
        k.lower() == "content-type" for k in headers
    ):
        headers["Content-Type"] = "application/json"
        if not body:
            body = b"{}"

    try:
        upstream = await pb_client.request(
            request.method,
            url,
            headers=headers,
            content=body,
        )
    except httpx.RequestError as e:
        return Response(
            content=f'{{"code":502,"message":"PocketBase unreachable: {e}"}}',
            media_type="application/json",
            status_code=502,
        )

    resp_headers = {
        k: v
        for k, v in upstream.headers.items()
        if k.lower() not in HOP_HEADERS and k.lower() != "content-encoding"
    }
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        headers=resp_headers,
        media_type=upstream.headers.get("content-type"),
    )


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    await pb_client.aclose()
